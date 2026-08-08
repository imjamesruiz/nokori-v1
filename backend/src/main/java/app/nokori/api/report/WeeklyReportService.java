package app.nokori.api.report;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.business.Business;
import app.nokori.api.business.BusinessAccess;
import app.nokori.api.business.BusinessRepository;
import app.nokori.api.common.WeekWindow;
import app.nokori.api.dashboard.dto.DayPoint;
import app.nokori.api.dashboard.dto.ItemCostPoint;
import app.nokori.api.dashboard.dto.ReasonSlice;
import app.nokori.api.report.dto.WeeklyReportResponse;
import app.nokori.api.waste.DayCostAggregate;
import app.nokori.api.waste.ItemCostAggregate;
import app.nokori.api.waste.ItemDayAggregate;
import app.nokori.api.waste.ReasonCostAggregate;
import app.nokori.api.waste.WasteEntryRepository;
import app.nokori.api.waste.WasteReason;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WeeklyReportService {

    private static final Logger log = LoggerFactory.getLogger(WeeklyReportService.class);

    /** Trailing window the recommendation rules look at (PRD F-010). */
    private static final int TRAILING_WEEKS = 4;

    private final WasteEntryRepository entries;
    private final WeeklyReportSnapshotRepository snapshots;
    private final BusinessRepository businesses;
    private final BusinessAccess access;
    private final RecommendationEngine recommendationEngine;

    public WeeklyReportService(WasteEntryRepository entries,
                               WeeklyReportSnapshotRepository snapshots,
                               BusinessRepository businesses,
                               BusinessAccess access,
                               RecommendationEngine recommendationEngine) {
        this.entries = entries;
        this.snapshots = snapshots;
        this.businesses = businesses;
        this.access = access;
        this.recommendationEngine = recommendationEngine;
    }

    /** {@code weeksAgo = 1} is "last week", the report the Monday notification points at. */
    @Transactional
    public WeeklyReportResponse weekly(AuthPrincipal principal, int weeksAgo) {
        Business business = access.require(principal);
        WeekWindow window = WeekWindow.weeksAgo(business.zoneId(), weeksAgo);
        return weekly(business, window);
    }

    @Transactional
    public WeeklyReportResponse weekly(Business business, WeekWindow window) {
        UUID businessId = business.getId();
        LocalDate today = LocalDate.now(business.zoneId());

        List<ItemCostAggregate> byItem = entries.aggregateByItem(businessId, window.start(), window.end());
        List<ReasonCostAggregate> byReason = entries.aggregateByReason(businessId, window.start(), window.end());
        List<DayCostAggregate> byDay = entries.aggregateByDay(businessId, window.start(), window.end());

        // A closed week is frozen once so later edits cannot rewrite a report the owner already read.
        Optional<WeeklyReportSnapshot> snapshot = window.isClosedOn(today)
                ? Optional.of(ensureSnapshot(business, window))
                : Optional.empty();

        BigDecimal total = snapshot.map(WeeklyReportSnapshot::getTotalCost)
                .orElseGet(() -> money(entries.sumCostBetween(businessId, window.start(), window.end())));
        BigDecimal previousTotal = snapshot.map(WeeklyReportSnapshot::getPreviousTotalCost)
                .orElseGet(() -> money(entries.sumCostBetween(businessId,
                        window.previous().start(), window.previous().end())));
        long entryCount = snapshot.map(s -> (long) s.getEntryCount())
                .orElseGet(() -> entries.countBetween(businessId, window.start(), window.end()));

        Recommendation recommendation = snapshot
                .filter(s -> s.getRuleId() != null)
                .map(s -> new Recommendation(s.getRuleId(), s.getRecommendationText()))
                .orElseGet(() -> buildRecommendation(businessId, window, byItem));

        String topItemName = snapshot.map(WeeklyReportSnapshot::getTopItemName)
                .orElseGet(() -> byItem.isEmpty() ? null : byItem.get(0).getItemName());
        BigDecimal topItemCost = snapshot.map(WeeklyReportSnapshot::getTopItemCost)
                .orElseGet(() -> byItem.isEmpty() ? null : money(byItem.get(0).getTotalCost()));
        // Snapshots store the enum name; the client always receives the human label.
        String topReasonLabel = snapshot.map(WeeklyReportSnapshot::getTopReason)
                .map(WeeklyReportService::reasonLabel)
                .orElseGet(() -> byReason.isEmpty() ? null : byReason.get(0).getReason().label());
        String worstDay = snapshot.map(WeeklyReportSnapshot::getWorstDay).orElseGet(() -> worstDayLabel(byDay));

        BigDecimal reasonTotal = byReason.stream()
                .map(r -> money(r.getTotalCost()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new WeeklyReportResponse(
                window.start(),
                window.end(),
                business.getCurrency(),
                total,
                previousTotal,
                changePercent(total, previousTotal),
                entryCount,
                topItemName,
                topItemCost,
                topReasonLabel,
                worstDay,
                recommendation,
                snapshot.isPresent(),
                byItem.stream().limit(3)
                        .map(row -> new ItemCostPoint(row.getItemId(), row.getItemName(), money(row.getTotalCost()),
                                row.getTotalQuantity(), row.getUnit(), row.getEntryCount()))
                        .toList(),
                byReason.stream()
                        .map(row -> new ReasonSlice(row.getReason(), row.getReason().label(),
                                money(row.getTotalCost()), share(money(row.getTotalCost()), reasonTotal),
                                row.getEntryCount()))
                        .toList(),
                byDay.stream()
                        .map(row -> new DayPoint(row.getWasteDate(),
                                row.getWasteDate().getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.US),
                                money(row.getTotalCost()), row.getEntryCount()))
                        .toList());
    }

    @Transactional
    public WeeklyReportSnapshot ensureSnapshot(Business business, WeekWindow window) {
        Optional<WeeklyReportSnapshot> existing =
                snapshots.findByBusinessIdAndWeekStart(business.getId(), window.start());
        if (existing.isPresent()) {
            return existing.get();
        }
        try {
            return snapshots.save(buildSnapshot(business, window));
        } catch (DataIntegrityViolationException race) {
            // Another request (or the scheduler) wrote the same week first; theirs wins.
            return snapshots.findByBusinessIdAndWeekStart(business.getId(), window.start())
                    .orElseThrow(() -> race);
        }
    }

    private WeeklyReportSnapshot buildSnapshot(Business business, WeekWindow window) {
        UUID businessId = business.getId();
        List<ItemCostAggregate> byItem = entries.aggregateByItem(businessId, window.start(), window.end());
        List<ReasonCostAggregate> byReason = entries.aggregateByReason(businessId, window.start(), window.end());
        List<DayCostAggregate> byDay = entries.aggregateByDay(businessId, window.start(), window.end());

        WeeklyReportSnapshot snapshot = new WeeklyReportSnapshot(businessId, window.start(), window.end());
        snapshot.setTotalCost(money(entries.sumCostBetween(businessId, window.start(), window.end())));
        snapshot.setPreviousTotalCost(money(entries.sumCostBetween(businessId,
                window.previous().start(), window.previous().end())));
        snapshot.setEntryCount((int) entries.countBetween(businessId, window.start(), window.end()));
        if (!byItem.isEmpty()) {
            snapshot.setTopItemName(byItem.get(0).getItemName());
            snapshot.setTopItemCost(money(byItem.get(0).getTotalCost()));
        }
        if (!byReason.isEmpty()) {
            snapshot.setTopReason(byReason.get(0).getReason().name());
        }
        snapshot.setWorstDay(worstDayLabel(byDay));

        Recommendation recommendation = buildRecommendation(businessId, window, byItem);
        snapshot.setRuleId(recommendation.ruleId());
        snapshot.setRecommendationText(recommendation.text());
        log.debug("Snapshotting week {} for business {}: total={} rule={}",
                window.start(), businessId, snapshot.getTotalCost(), recommendation.ruleId());
        return snapshot;
    }

    private Recommendation buildRecommendation(UUID businessId, WeekWindow window,
                                               List<ItemCostAggregate> thisWeekItems) {
        LocalDate trailingStart = window.start().minusWeeks(TRAILING_WEEKS - 1L);
        List<ItemDayAggregate> itemDays =
                entries.aggregateByItemAndDay(businessId, trailingStart, window.end());
        List<ReasonCostAggregate> trailingReasons =
                entries.aggregateByReason(businessId, trailingStart, window.end());
        WeekWindow previous = window.previous();
        List<ItemCostAggregate> lastWeekItems =
                entries.aggregateByItem(businessId, previous.start(), previous.end());
        return recommendationEngine.recommend(itemDays, trailingReasons, thisWeekItems, lastWeekItems);
    }

    /**
     * Writes any missing snapshot for each business's most recently closed week. Runs hourly so it
     * lands shortly after Monday 00:00 in every timezone, and self-heals if a run is missed.
     */
    @Transactional
    public int snapshotClosedWeeks() {
        int written = 0;
        for (Business business : businesses.findAllByOrderByCreatedAtAsc()) {
            LocalDate today = LocalDate.now(business.zoneId());
            WeekWindow lastWeek = WeekWindow.containing(today).previous();
            if (!lastWeek.isClosedOn(today)) {
                continue;
            }
            if (snapshots.findByBusinessIdAndWeekStart(business.getId(), lastWeek.start()).isEmpty()) {
                ensureSnapshot(business, lastWeek);
                written++;
            }
        }
        return written;
    }

    private static String reasonLabel(String storedName) {
        try {
            return WasteReason.valueOf(storedName).label();
        } catch (IllegalArgumentException ex) {
            // A reason retired since the snapshot was written; show the stored value rather than fail.
            return storedName;
        }
    }

    private static String worstDayLabel(List<DayCostAggregate> byDay) {
        return byDay.stream()
                .max(Comparator.comparing(row -> money(row.getTotalCost())))
                .map(row -> row.getWasteDate().getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.US))
                .orElse(null);
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

    private static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, RoundingMode.HALF_UP);
    }
}
