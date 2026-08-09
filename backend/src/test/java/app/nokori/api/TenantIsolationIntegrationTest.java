package app.nokori.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nokori.api.support.ApiIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * The failure mode that would kill trust in Nokori is one business reading another's data
 * (PRD section 11, OWASP API1:2023). Every business-scoped endpoint is probed with a valid
 * token from the wrong business.
 */
class TenantIsolationIntegrationTest extends ApiIntegrationTest {

    @Test
    @DisplayName("A valid token cannot read, edit, or delete another business's item")
    void cannotTouchAnotherBusinessesItem() throws Exception {
        String alice = ownerWithBusiness("Alice's Tacos");
        String bob = ownerWithBusiness("Bob's Bakery");

        UUID aliceItem = id(createItem(alice, "Carnitas", "6.50"));

        mvc.perform(get("/inventory").header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mvc.perform(put("/inventory/" + aliceItem)
                        .header("Authorization", "Bearer " + bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "name", "Stolen", "category", "PROTEIN", "unit", "LB", "costPerUnit", "1.00"))))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/inventory/" + aliceItem).header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());

        // Alice's item is untouched.
        mvc.perform(get("/inventory").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Carnitas"));
    }

    @Test
    @DisplayName("A waste entry cannot be logged against another business's item")
    void cannotLogWasteAgainstAnotherBusinessesItem() throws Exception {
        String alice = ownerWithBusiness("Alice's Tacos");
        String bob = ownerWithBusiness("Bob's Bakery");
        UUID aliceItem = id(createItem(alice, "Carnitas", "6.50"));

        mvc.perform(post("/waste-entries")
                        .header("Authorization", "Bearer " + bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "inventoryItemId", aliceItem, "quantity", "1", "reason", "OVER_PREPPED"))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Waste entries, history, and dashboard totals never cross businesses")
    void wasteDataStaysWithinItsBusiness() throws Exception {
        String alice = ownerWithBusiness("Alice's Tacos");
        String bob = ownerWithBusiness("Bob's Bakery");

        UUID aliceItem = id(createItem(alice, "Carnitas", "6.50"));
        JsonNode aliceEntry = logWaste(alice, aliceItem, "2", "OVER_PREPPED", today);
        UUID aliceEntryId = id(aliceEntry);

        mvc.perform(get("/waste-entries").header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(0));

        mvc.perform(put("/waste-entries/" + aliceEntryId)
                        .header("Authorization", "Bearer " + bob)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "quantity", "99", "reason", "OTHER", "wasteDate", today.toString()))))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/waste-entries/" + aliceEntryId).header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());

        mvc.perform(get("/dashboard/summary").header("Authorization", "Bearer " + bob))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWasted").value(0.00));

        mvc.perform(get("/dashboard/summary").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalWasted").value(13.00));
    }

    @Test
    @DisplayName("Business profile reads are scoped to the caller")
    void businessProfileIsScopedToTheCaller() throws Exception {
        String alice = ownerWithBusiness("Alice's Tacos");
        String bob = ownerWithBusiness("Bob's Bakery");

        mvc.perform(get("/businesses/me").header("Authorization", "Bearer " + alice))
                .andExpect(jsonPath("$.name").value("Alice's Tacos"));
        mvc.perform(get("/businesses/me").header("Authorization", "Bearer " + bob))
                .andExpect(jsonPath("$.name").value("Bob's Bakery"));
    }

    @Test
    void protectedEndpointsRejectMissingAndBogusTokens() throws Exception {
        mvc.perform(get("/inventory")).andExpect(status().isUnauthorized());
        mvc.perform(get("/inventory").header("Authorization", "Bearer not-a-token"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/dashboard/summary").header("Authorization", "Bearer " + "a.b.c"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("A user without a business gets a routing signal, not someone else's data")
    void userWithoutBusinessIsToldToFinishSetup() throws Exception {
        String token = registerUser();
        mvc.perform(get("/inventory").header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("business_required"));
    }
}
