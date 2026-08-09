package app.nokori.api.dashboard.dto;

import app.nokori.api.inventory.ItemUnit;
import app.nokori.api.waste.WasteReason;
import app.nokori.api.waste.dto.WasteEntryResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Home screen payload (PRD F-005). Dollars are the headline, everything else is supporting. */
public record DashboardSummaryResponse(
        LocalDate weekStart,
        LocalDate weekEnd,
        boolean isCurrentWeek,
        String currency,
        BigDecimal totalWasted,
        long entryCount,
        BigDecimal previousWeekTotal,
        BigDecimal changePercent,
        /** Run-rate estimate, not a forecast — label it as an estimate in the UI. */
        BigDecimal projectedMonthly,
        TopItem topItem,
        WorstDay worstDay,
        TopReason topReason,
        List<WasteEntryResponse> recentEntries) {

    public record TopItem(UUID itemId, String name, BigDecimal cost, BigDecimal quantity, ItemUnit unit) {
    }

    public record WorstDay(LocalDate date, String label, BigDecimal cost) {
    }

    public record TopReason(WasteReason reason, String label, BigDecimal cost, BigDecimal share) {
    }
}
