package app.nokori.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.nokori.api.common.WeekWindow;
import app.nokori.api.inventory.ItemUnit;
import app.nokori.api.report.WeeklyReportSnapshotRepository;
import app.nokori.api.support.ApiIntegrationTest;
import app.nokori.api.waste.WasteEntry;
import app.nokori.api.waste.WasteEntryRepository;
import app.nokori.api.waste.WasteReason;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Closed weeks are served from a frozen snapshot (PRD F-007). Entries are written straight through
 * the repository so the week under test is deterministically in the past, which the API's
 * seven-day backdate limit would otherwise prevent.
 */
class WeeklyReportSnapshotIntegrationTest extends ApiIntegrationTest {

    @Autowired
    private WasteEntryRepository entries;

    @Autowired
    private WeeklyReportSnapshotRepository snapshots;

    @Test
    @DisplayName("A closed week is frozen, and its stored reason is returned as a human label")
    void closedWeekIsSnapshottedWithReadableLabels() throws Exception {
        String token = registerUser();
        UUID businessId = id(createBusiness(token, "Sunset Taco Truck"));
        UUID itemId = id(createItem(token, "Carnitas", "6.50"));

        WeekWindow lastWeek = WeekWindow.containing(today).previous();
        entries.save(entry(businessId, itemId, "4", WasteReason.OVER_PREPPED, lastWeek.start()));
        entries.save(entry(businessId, itemId, "2", WasteReason.EXPIRED_SPOILED, lastWeek.start().plusDays(3)));

        mvc.perform(get("/reports/weekly?weeksAgo=1").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fromSnapshot").value(true))
                .andExpect(jsonPath("$.totalCost").value(39.00))
                .andExpect(jsonPath("$.entryCount").value(2))
                .andExpect(jsonPath("$.topItemName").value("Carnitas"))
                // Not the raw OVER_PREPPED enum name.
                .andExpect(jsonPath("$.topReasonLabel").value("Over-prepped"));

        assertThat(snapshots.findByBusinessIdAndWeekStart(businessId, lastWeek.start())).isPresent();
    }

    @Test
    @DisplayName("Editing an entry after the week closed does not move the frozen total")
    void snapshotSurvivesLaterEdits() throws Exception {
        String token = registerUser();
        UUID businessId = id(createBusiness(token, "Sunset Taco Truck"));
        UUID itemId = id(createItem(token, "Carnitas", "6.50"));

        WeekWindow lastWeek = WeekWindow.containing(today).previous();
        WasteEntry saved = entries.save(entry(businessId, itemId, "4", WasteReason.OVER_PREPPED, lastWeek.start()));

        mvc.perform(get("/reports/weekly?weeksAgo=1").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.totalCost").value(26.00));

        saved.applyEdit(new BigDecimal("40"), WasteReason.OVER_PREPPED, lastWeek.start(), null);
        entries.save(saved);

        mvc.perform(get("/reports/weekly?weeksAgo=1").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.totalCost").value(26.00))
                .andExpect(jsonPath("$.fromSnapshot").value(true));
    }

    private WasteEntry entry(UUID businessId, UUID itemId, String quantity, WasteReason reason, LocalDate date) {
        return new WasteEntry(businessId, itemId, new BigDecimal(quantity), ItemUnit.LB,
                new BigDecimal("6.50"), reason, date, null, null, null);
    }
}
