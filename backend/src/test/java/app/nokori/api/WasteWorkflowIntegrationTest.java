package app.nokori.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nokori.api.support.ApiIntegrationTest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** Signup through dashboard and export — the flow the MVP definition of done describes (PRD 12.1). */
class WasteWorkflowIntegrationTest extends ApiIntegrationTest {

    @Test
    @DisplayName("Logging 5 lb of $3.50/lb chicken records $17.50 (PRD F-004 acceptance criteria)")
    void costIsComputedServerSide() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID chicken = id(createItem(token, "Grilled chicken", "3.50"));

        mvc.perform(post("/waste-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "inventoryItemId", chicken,
                                "quantity", "5",
                                "reason", "OVER_PREPPED",
                                // A client-supplied cost must be ignored; the server owns the math.
                                "totalCostLost", "0.01"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalCostLost").value(17.50))
                .andExpect(jsonPath("$.costPerUnit").value(3.5000))
                .andExpect(jsonPath("$.itemName").value("Grilled chicken"));
    }

    @Test
    @DisplayName("Editing an item's cost leaves past entries at the cost they were logged with")
    void historyKeepsItsCostSnapshot() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        var item = createItem(token, "Carnitas", "6.00");
        UUID itemId = id(item);
        logWaste(token, itemId, "2", "OVER_PREPPED", today);

        Map<String, Object> repriced = new LinkedHashMap<>();
        repriced.put("name", "Carnitas");
        repriced.put("category", "PROTEIN");
        repriced.put("unit", "LB");
        repriced.put("costPerUnit", "9.00");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/inventory/" + itemId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(repriced)))
                .andExpect(status().isOk());

        mvc.perform(get("/waste-entries").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.content[0].totalCostLost").value(12.00))
                .andExpect(jsonPath("$.content[0].costPerUnit").value(6.0000));
    }

    @Test
    void dashboardSummarisesTheWeek() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID carnitas = id(createItem(token, "Carnitas", "6.50"));
        UUID tortillas = id(createItem(token, "Corn tortillas", "1.20"));

        logWaste(token, carnitas, "4", "OVER_PREPPED", today);      // 26.00
        logWaste(token, tortillas, "3", "EXPIRED_SPOILED", today);  //  3.60

        mvc.perform(get("/dashboard/summary").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWasted").value(29.60))
                .andExpect(jsonPath("$.entryCount").value(2))
                .andExpect(jsonPath("$.topItem.name").value("Carnitas"))
                .andExpect(jsonPath("$.topItem.cost").value(26.00))
                .andExpect(jsonPath("$.topReason.reason").value("OVER_PREPPED"))
                .andExpect(jsonPath("$.isCurrentWeek").value(true))
                .andExpect(jsonPath("$.recentEntries.length()").value(2));

        mvc.perform(get("/dashboard/top-items").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].name").value("Carnitas"))
                .andExpect(jsonPath("$[1].name").value("Corn tortillas"));

        mvc.perform(get("/dashboard/by-reason").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].reason").value("OVER_PREPPED"));
    }

    @Test
    @DisplayName("A single entry suppresses the worst-day card (PRD F-005 edge case)")
    void worstDayNeedsMoreThanOneEntry() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID carnitas = id(createItem(token, "Carnitas", "6.50"));
        logWaste(token, carnitas, "1", "OVER_PREPPED", today);

        mvc.perform(get("/dashboard/summary").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.worstDay").doesNotExist());
    }

    @Test
    void emptyWeekReturnsZeroNotAnError() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        mvc.perform(get("/dashboard/summary").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWasted").value(0.00))
                .andExpect(jsonPath("$.entryCount").value(0))
                .andExpect(jsonPath("$.topItem").doesNotExist());
    }

    @Test
    @DisplayName("Replaying an offline entry with the same client id creates it once (PRD F-012)")
    void clientUuidMakesCreationIdempotent() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID carnitas = id(createItem(token, "Carnitas", "6.50"));
        UUID clientUuid = UUID.randomUUID();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("inventoryItemId", carnitas);
        body.put("quantity", "2");
        body.put("reason", "OVER_PREPPED");
        body.put("clientUuid", clientUuid);

        String payload = json.writeValueAsString(body);
        mvc.perform(post("/waste-entries").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated());
        mvc.perform(post("/waste-entries").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated());

        mvc.perform(get("/waste-entries").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    @Test
    void historyFiltersByItemAndReason() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID carnitas = id(createItem(token, "Carnitas", "6.50"));
        UUID tortillas = id(createItem(token, "Corn tortillas", "1.20"));
        logWaste(token, carnitas, "1", "OVER_PREPPED", today);
        logWaste(token, tortillas, "2", "EXPIRED_SPOILED", today);

        mvc.perform(get("/waste-entries?itemId=" + carnitas).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].itemName").value("Carnitas"));

        mvc.perform(get("/waste-entries?reason=EXPIRED_SPOILED").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].itemName").value("Corn tortillas"));

        mvc.perform(get("/waste-entries?category=DAIRY").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.page.totalElements").value(0));
    }

    @Test
    @DisplayName("CSV export matches the filtered on-screen data (PRD F-008 acceptance criteria)")
    void csvExportMatchesTheData() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID carnitas = id(createItem(token, "Carnitas", "6.50"));
        logWaste(token, carnitas, "4", "OVER_PREPPED", today);

        String csv = mvc.perform(get("/exports/waste.csv").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);

        assertThat(csv).startsWith("﻿date,item,category,quantity,unit,cost_per_unit,total_cost_lost,reason,note");
        assertThat(csv).contains("\"Carnitas\"").contains("26.00").contains("\"Over-prepped\"");
    }

    @Test
    void deletingAnItemWithHistoryKeepsTheHistory() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID carnitas = id(createItem(token, "Carnitas", "6.50"));
        logWaste(token, carnitas, "1", "OVER_PREPPED", today);

        mvc.perform(delete("/inventory/" + carnitas).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Gone from the picker...
        mvc.perform(get("/inventory").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(0));
        // ...but still in history and reports.
        mvc.perform(get("/inventory?includeInactive=true").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/waste-entries").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.page.totalElements").value(1));

        // And it can no longer be logged against.
        mvc.perform(post("/waste-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "inventoryItemId", carnitas, "quantity", "1", "reason", "OVER_PREPPED"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("item_inactive"));
    }

    @Test
    void rejectsFutureDatesDuplicateNamesAndBadQuantities() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID carnitas = id(createItem(token, "Carnitas", "6.50"));

        mvc.perform(post("/waste-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "inventoryItemId", carnitas, "quantity", "1", "reason", "OVER_PREPPED",
                                "wasteDate", today.plusDays(1).toString()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("waste_date_future"));

        mvc.perform(post("/waste-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "inventoryItemId", carnitas, "quantity", "0", "reason", "OVER_PREPPED"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("validation_failed"));

        // Case-insensitive duplicate names are rejected (PRD F-003).
        mvc.perform(post("/inventory")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "name", "carnitas", "category", "PROTEIN", "unit", "LB", "costPerUnit", "1.00"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("item_exists"));
    }

    @Test
    void duplicateRegistrationIsRejectedAndLoginErrorsStayVague() throws Exception {
        String email = "dupe-" + UUID.randomUUID() + "@example.com";
        String body = json.writeValueAsString(Map.of("email", email, "password", "correct horse 42"));

        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("email_taken"));

        // Wrong password and unknown email must be indistinguishable (PRD F-001).
        String wrongPassword = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", "nope nope nope"))))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        String unknownEmail = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "email", "nobody-" + UUID.randomUUID() + "@example.com",
                                "password", "nope nope nope"))))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        assertThat(wrongPassword).isEqualTo(unknownEmail);
    }

    @Test
    @DisplayName("Account deletion removes the account and its business data (App Review 5.1.1(v))")
    void accountDeletionRemovesEverything() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID carnitas = id(createItem(token, "Carnitas", "6.50"));
        logWaste(token, carnitas, "1", "OVER_PREPPED", today);

        mvc.perform(delete("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // The token still parses, but nothing is left behind it.
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/inventory").header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());
    }

    @Test
    void secondBusinessPerOwnerIsRejected() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        mvc.perform(post("/businesses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "name", "Second Truck", "businessType", "CAFE",
                                "timezone", "America/Los_Angeles"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("business_exists"));
    }

    @Test
    void weeklyReportProducesARecommendationOnceThereIsEnoughData() throws Exception {
        String token = ownerWithBusiness("Sunset Taco Truck");
        UUID tortillas = id(createItem(token, "Corn tortillas", "1.20"));
        for (int i = 0; i < 6; i++) {
            logWaste(token, tortillas, "2", "OVER_PREPPED", today.minusDays(i % 7));
        }

        mvc.perform(get("/reports/weekly?weeksAgo=0").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recommendation.ruleId").exists())
                .andExpect(jsonPath("$.topItemName").value("Corn tortillas"))
                .andExpect(jsonPath("$.fromSnapshot").value(false));
    }
}
