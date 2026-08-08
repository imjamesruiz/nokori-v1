package app.nokori.api.dashboard;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.business.Business;
import app.nokori.api.business.BusinessAccess;
import app.nokori.api.common.WeekWindow;
import app.nokori.api.dashboard.dto.DashboardSummaryResponse;
import app.nokori.api.dashboard.dto.DayPoint;
import app.nokori.api.dashboard.dto.ItemCostPoint;
import app.nokori.api.dashboard.dto.ReasonSlice;
import app.nokori.api.waste.DayCostAggregate;
import app.nokori.api.waste.ItemCostAggregate;
import app.nokori.api.waste.ReasonCostAggregate;
import app.nokori.api.waste.WasteEntryRepository;
import app.nokori.api.waste.WasteService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    /** Average days per month, used for the run-rate estimate (PRD F-005). */
    private static final BigDecimal DAYS_PER_MONTH = new BigDecimal("30.4");

    private final WasteEntryRepository entries;
    private final WasteService wasteService;
    private final BusinessAccess access;

    public DashboardService(WasteEntryRepository entries, WasteService wasteService, BusinessAccess access) {
        this.entries = entries;
        this.wasteService = wasteService;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary(AuthPrincipal principal, int weeksAgo) {
        Business business = access.require(principal);
        UUID businessId = business.getId();
        ZoneId zone = business.zoneId();
        LocalDate today = LocalDate.now(zone);

        WeekWindow window = WeekWindow.weeksAgo(zone, weeksAgo);
        WeekWindow previous = window.previous();
        boolean isCurrentWeek = window.contains(today);

        BigDecimal total = money(entries.sumCostBetween(businessId, window.start(), window.end()));
        long entryCount = entries.countBetween(businessId, window.start(), window.end());
        BigDecimal previousTotal = money(entries.sumCostBetween(businessId, previous.start(), previous.end()));

        List<ItemCostAggregate> byItem = entries.aggregateByItem(businessId, window.start(), window.end());
        List<ReasonCostAggregate> byReason = entries.aggregateByReason(businessId, window.start(), window.end());
        List<DayCostAggregate> byDay = entries.aggregateByDay(businessId, window.start(), window.end());

        DashboardSummaryResponse.TopItem topItem = byItem.isEmpty() ? null : toTopItem(byItem.get(0));
        DashboardSummaryResponse.TopReason topReason = byReason.isEmpty() ? null : toTopReason(byReason.get(0), total);
        // A single entry makes "worst day" meaningless (PRD F-005 edge case).
        DashboardSummaryResponse.WorstDay worstDay = entryCount < 2 ? null : worstDay(byDay);

        return new DashboardSummaryResponse(
                window.start(),
                window.end(),
                isCurrentWeek,
                business.getCurrency(),
                total,
                entryCount,
                previousTotal,
                changePercent(total, previousTotal),
                projectedMonthly(total, window, today, isCurrentWeek),
                topItem,
                worstDay,
                topReason,
                wasteService.recent(businessId));
    }

    @Transactional(readOnly = true)
    public List<ItemCostPoint> topItems(AuthPrincipal principal, int weeksAgo, int limit) {
        Business business = access.require(principal);
        WeekWindow window = WeekWindow.weeksAgo(business.zoneId(), weeksAgo);
        return entries.aggregateByItem(business.getId(), window.start(), window.end()).stream()
                .limit(limit)
                .map(row -> new ItemCostPoint(row.getItemId(), row.getItemName(), money(row.getTotalCost()),
                        row.getTotalQuantity(), row.getUnit(), row.getEntryCount()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReasonSlice> byReason(AuthPrincipal principal, int weeksAgo) {
        Business business = access.require(principal);
        WeekWindow window = WeekWindow.weeksAgo(business.zoneId(), weeksAgo);
        List<ReasonCostAggregate> rows = entries.aggregateByReason(business.getId(), window.start(), window.end());
        BigDecimal total = rows.stream().map(r -> money(r.getTotalCost())).reduce(BigDecimal.ZERO, BigDecimal::add);
        return rows.stream()
                .map(row -> new ReasonSlice(row.getReason(), row.getReason().label(), money(row.getTotalCost()),
                        share(money(row.getTotalCost()), total), row.getEntryCount()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DayPoint> byDay(AuthPrincipal principal, int weeksAgo) {
        Business business = access.require(principal);
        WeekWindow window = WeekWindow.weeksAgo(business.zoneId(), weeksAgo);
        List<DayCostAggregate> rows = entries.aggregateByDay(business.getId(), window.start(), window.end());
        return rows.stream()
                .map(row -> new DayPoint(row.getWasteDate(), dayLabel(row.getWasteDate()),
                        money(row.getTotalCost()), row.getEntryCount()))
                .toList();
    }

    private DashboardSummaryResponse.TopItem toTopItem(ItemCostAggregate row) {
        return new DashboardSummaryResponse.TopItem(row.getItemId(), row.getItemName(),
                money(row.getTotalCost()), row.getTotalQuantity(), row.getUnit());
    }

    private DashboardSummaryResponse.TopReason toTopReason(ReasonCostAggregate row, BigDecimal total) {
        return new DashboardSummaryResponse.TopReason(row.getReason(), row.getReason().label(),
                money(row.getTotalCost()), share(money(row.getTotalCost()), total));
    }

    private DashboardSummaryResponse.WorstDay worstDay(List<DayCostAggregate> byDay) {
        return byDay.stream()
                .max(Comparator.comparing(row -> money(row.getTotalCost())))
                .map(row -> new DashboardSummaryResponse.WorstDay(
                        row.getWasteDate(), dayLabel(row.getWasteDate()), money(row.getTotalCost())))
                .orElse(null);
    }

    private BigDecimal projectedMonthly(BigDecimal total, WeekWindow window, LocalDate today, boolean isCurrentWeek) {
        if (total.signum() == 0) {
            return BigDecimal.ZERO;
        }
        long elapsedDays = isCurrentWeek
                ? ChronoUnit.DAYS.between(window.start(), today) + 1
                : 7;
        if (elapsedDays <= 0) {
            return BigDecimal.ZERO;
        }
        return total.divide(BigDecimal.valueOf(elapsedDays), 6, RoundingMode.HALF_UP)
                .multiply(DAYS_PER_MONTH)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal changePercent(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.signum() == 0) {
            return null;
        }
        return current.subtract(previous)
                .divide(previous, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(1, RoundingMode.HALF_UP);
    }

    private static BigDecimal share(BigDecimal value, BigDecimal total) {
        if (total == null || total.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return value.divide(total, 4, RoundingMode.HALF_UP);
    }

    private static String dayLabel(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day.getDisplayName(TextStyle.FULL, Locale.US);
    }

    static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, RoundingMode.HALF_UP);
    }
}
