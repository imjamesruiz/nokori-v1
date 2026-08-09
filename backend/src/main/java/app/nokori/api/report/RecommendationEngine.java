package app.nokori.api.report;

import app.nokori.api.waste.ItemCostAggregate;
import app.nokori.api.waste.ItemDayAggregate;
import app.nokori.api.waste.ReasonCostAggregate;
import app.nokori.api.waste.WasteReason;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.format.TextStyle;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Explainable rules, not ML (PRD F-010). Rules are evaluated in order and the first match wins.
 *
 * <p>The day-specific rule is evaluated before the repeat-item rule so the PRD F-007 acceptance
 * case — the same item wasted two Fridays running — produces the concrete "prep less next Friday"
 * sentence rather than the generic repeat-item one.
 */
@Component
public class RecommendationEngine {

    /** Below this many entries in the trailing window there is not enough signal to advise. */
    static final int MIN_ENTRIES = 10;

    private static final BigDecimal OVER_PREPPED_SHARE = new BigDecimal("0.50");
    private static final BigDecimal SPOILAGE_SHARE = new BigDecimal("0.40");

    /**
     * @param trailingItemDays item/day rollup over the trailing window (about 4 weeks)
     * @param trailingReasons  reason totals over the same window
     * @param thisWeekItems    item totals for the reported week, most expensive first
     * @param lastWeekItems    item totals for the week before it, most expensive first
     */
    public Recommendation recommend(List<ItemDayAggregate> trailingItemDays,
                                    List<ReasonCostAggregate> trailingReasons,
                                    List<ItemCostAggregate> thisWeekItems,
                                    List<ItemCostAggregate> lastWeekItems) {

        long entryCount = trailingReasons.stream().mapToLong(ReasonCostAggregate::getEntryCount).sum();
        if (entryCount < MIN_ENTRIES) {
            return Recommendation.NOT_ENOUGH_DATA;
        }

        return dayPattern(trailingItemDays)
                .or(() -> repeatedItem(thisWeekItems, lastWeekItems))
                .or(() -> reasonDominates(trailingReasons))
                .orElse(new Recommendation("keep_logging",
                        "No single pattern stands out yet — keep logging and check back next week."));
    }

    /** Same item wasted on the same weekday 2+ times in the window. */
    private Optional<Recommendation> dayPattern(List<ItemDayAggregate> itemDays) {
        record ItemWeekday(UUID itemId, String itemName, DayOfWeek day) {
        }
        Map<ItemWeekday, Integer> occurrences = new LinkedHashMap<>();
        Map<ItemWeekday, BigDecimal> cost = new LinkedHashMap<>();

        for (ItemDayAggregate row : itemDays) {
            ItemWeekday key = new ItemWeekday(row.getItemId(), row.getItemName(), row.getWasteDate().getDayOfWeek());
            occurrences.merge(key, 1, Integer::sum);
            cost.merge(key, nz(row.getTotalCost()), BigDecimal::add);
        }

        return occurrences.entrySet().stream()
                .filter(e -> e.getValue() >= 2)
                .max((a, b) -> cost.get(a.getKey()).compareTo(cost.get(b.getKey())))
                .map(e -> new Recommendation("day_specific_pattern", String.format(
                        "Prep 10-15%% less %s next %s — it has been wasted %d %ss in the last month.",
                        e.getKey().itemName(),
                        weekdayName(e.getKey().day()),
                        e.getValue(),
                        weekdayName(e.getKey().day()))));
    }

    /** Same item in the top 3 by cost two weeks running. */
    private Optional<Recommendation> repeatedItem(List<ItemCostAggregate> thisWeek, List<ItemCostAggregate> lastWeek) {
        List<UUID> lastWeekTop = lastWeek.stream().limit(3).map(ItemCostAggregate::getItemId).toList();
        return thisWeek.stream()
                .limit(3)
                .filter(item -> lastWeekTop.contains(item.getItemId()))
                .findFirst()
                .map(item -> new Recommendation("repeated_item", String.format(
                        "Review prep for %s — it has been a top source of waste two weeks running.",
                        item.getItemName())));
    }

    /** One reason accounts for most of the money lost. */
    private Optional<Recommendation> reasonDominates(List<ReasonCostAggregate> reasons) {
        BigDecimal total = reasons.stream()
                .map(r -> nz(r.getTotalCost()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.signum() <= 0) {
            return Optional.empty();
        }

        Map<WasteReason, BigDecimal> share = new LinkedHashMap<>();
        for (ReasonCostAggregate row : reasons) {
            share.put(row.getReason(), nz(row.getTotalCost()).divide(total, 4, RoundingMode.HALF_UP));
        }

        if (share.getOrDefault(WasteReason.OVER_PREPPED, BigDecimal.ZERO).compareTo(OVER_PREPPED_SHARE) > 0) {
            return Optional.of(new Recommendation("over_prepped_dominates",
                    "Over-prepping is most of your waste cost — start with smaller batches on your repeat items."));
        }
        if (share.getOrDefault(WasteReason.EXPIRED_SPOILED, BigDecimal.ZERO).compareTo(SPOILAGE_SHARE) > 0) {
            return Optional.of(new Recommendation("spoilage_dominates",
                    "Spoilage is most of your waste cost — order less or hold smaller quantities of these items."));
        }

        WasteReason topReason = reasons.isEmpty() ? null : reasons.get(0).getReason();
        if (topReason == WasteReason.BURNED_DAMAGED) {
            return Optional.of(new Recommendation("burned_damaged_pattern",
                    "Burned or damaged food is your top waste reason — review the process or staff training on these items."));
        }
        return Optional.empty();
    }

    private static String weekdayName(DayOfWeek day) {
        return day.getDisplayName(TextStyle.FULL, Locale.US);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
