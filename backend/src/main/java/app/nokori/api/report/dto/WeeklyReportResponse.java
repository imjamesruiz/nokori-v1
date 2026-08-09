package app.nokori.api.report.dto;

import app.nokori.api.dashboard.dto.DayPoint;
import app.nokori.api.dashboard.dto.ItemCostPoint;
import app.nokori.api.dashboard.dto.ReasonSlice;
import app.nokori.api.report.Recommendation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Weekly report (PRD F-007). Headline numbers come from the frozen snapshot once the week
 * has closed; the chart lists are recomputed live from the underlying entries.
 */
public record WeeklyReportResponse(
        LocalDate weekStart,
        LocalDate weekEnd,
        String currency,
        BigDecimal totalCost,
        BigDecimal previousTotalCost,
        BigDecimal changePercent,
        long entryCount,
        String topItemName,
        BigDecimal topItemCost,
        String topReasonLabel,
        String worstDay,
        Recommendation recommendation,
        boolean fromSnapshot,
        List<ItemCostPoint> topItems,
        List<ReasonSlice> byReason,
        List<DayPoint> byDay) {
}
