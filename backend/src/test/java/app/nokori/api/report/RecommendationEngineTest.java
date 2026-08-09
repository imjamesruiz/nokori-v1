package app.nokori.api.report;

import static org.assertj.core.api.Assertions.assertThat;

import app.nokori.api.inventory.ItemUnit;
import app.nokori.api.waste.ItemCostAggregate;
import app.nokori.api.waste.ItemDayAggregate;
import app.nokori.api.waste.ReasonCostAggregate;
import app.nokori.api.waste.WasteReason;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RecommendationEngineTest {

    private final RecommendationEngine engine = new RecommendationEngine();

    private static final UUID TORTILLAS = UUID.randomUUID();
    private static final UUID CARNITAS = UUID.randomUUID();

    @Test
    @DisplayName("Tortillas wasted two Fridays running produces the Friday prep recommendation (PRD F-007)")
    void dayPatternWins() {
        List<ItemDayAggregate> itemDays = List.of(
                itemDay(TORTILLAS, "Corn tortillas", LocalDate.of(2026, 7, 24), "18.00"),
                itemDay(TORTILLAS, "Corn tortillas", LocalDate.of(2026, 7, 31), "22.00"));

        Recommendation recommendation = engine.recommend(
                itemDays,
                List.of(reason(WasteReason.OVER_PREPPED, "40.00", 12)),
                List.of(item(TORTILLAS, "Corn tortillas", "22.00")),
                List.of(item(TORTILLAS, "Corn tortillas", "18.00")));

        assertThat(recommendation.ruleId()).isEqualTo("day_specific_pattern");
        assertThat(recommendation.text()).contains("Corn tortillas").contains("Friday").contains("10-15%");
    }

    @Test
    void repeatedItemFiresWhenThereIsNoWeekdayPattern() {
        // Same item both weeks, but every occurrence lands on a different weekday.
        List<ItemDayAggregate> itemDays = List.of(
                itemDay(CARNITAS, "Carnitas", LocalDate.of(2026, 7, 20), "15.00"),
                itemDay(CARNITAS, "Carnitas", LocalDate.of(2026, 7, 28), "12.00"));

        Recommendation recommendation = engine.recommend(
                itemDays,
                List.of(reason(WasteReason.TRIM_PREP, "27.00", 11)),
                List.of(item(CARNITAS, "Carnitas", "12.00")),
                List.of(item(CARNITAS, "Carnitas", "15.00")));

        assertThat(recommendation.ruleId()).isEqualTo("repeated_item");
        assertThat(recommendation.text()).contains("Carnitas");
    }

    @Test
    void overPreppingDominatesWhenItIsMoreThanHalfTheCost() {
        Recommendation recommendation = engine.recommend(
                List.of(),
                List.of(reason(WasteReason.OVER_PREPPED, "80.00", 10),
                        reason(WasteReason.TRIM_PREP, "20.00", 4)),
                List.of(item(TORTILLAS, "Corn tortillas", "40.00")),
                List.of(item(CARNITAS, "Carnitas", "10.00")));

        assertThat(recommendation.ruleId()).isEqualTo("over_prepped_dominates");
    }

    @Test
    void spoilageDominatesWhenItIsMoreThanFortyPercent() {
        Recommendation recommendation = engine.recommend(
                List.of(),
                List.of(reason(WasteReason.EXPIRED_SPOILED, "45.00", 10),
                        reason(WasteReason.TRIM_PREP, "30.00", 5),
                        reason(WasteReason.OVER_PREPPED, "25.00", 3)),
                List.of(item(TORTILLAS, "Corn tortillas", "40.00")),
                List.of(item(CARNITAS, "Carnitas", "10.00")));

        assertThat(recommendation.ruleId()).isEqualTo("spoilage_dominates");
    }

    @Test
    @DisplayName("Thin data is suppressed rather than guessed at (PRD F-010 edge case)")
    void notEnoughDataSuppressesAdvice() {
        Recommendation recommendation = engine.recommend(
                List.of(itemDay(TORTILLAS, "Corn tortillas", LocalDate.of(2026, 7, 24), "5.00")),
                List.of(reason(WasteReason.OVER_PREPPED, "5.00", 3)),
                List.of(item(TORTILLAS, "Corn tortillas", "5.00")),
                List.of());

        assertThat(recommendation).isEqualTo(Recommendation.NOT_ENOUGH_DATA);
    }

    @Test
    void isDeterministicForAFixedDataset() {
        List<ItemDayAggregate> itemDays = new ArrayList<>(List.of(
                itemDay(TORTILLAS, "Corn tortillas", LocalDate.of(2026, 7, 24), "18.00"),
                itemDay(TORTILLAS, "Corn tortillas", LocalDate.of(2026, 7, 31), "22.00")));
        List<ReasonCostAggregate> reasons = List.of(reason(WasteReason.OVER_PREPPED, "40.00", 12));
        List<ItemCostAggregate> thisWeek = List.of(item(TORTILLAS, "Corn tortillas", "22.00"));
        List<ItemCostAggregate> lastWeek = List.of(item(TORTILLAS, "Corn tortillas", "18.00"));

        Recommendation first = engine.recommend(itemDays, reasons, thisWeek, lastWeek);
        Recommendation second = engine.recommend(itemDays, reasons, thisWeek, lastWeek);
        assertThat(first).isEqualTo(second);
    }

    private static ItemDayAggregate itemDay(UUID id, String name, LocalDate date, String cost) {
        return new ItemDayAggregate() {
            @Override
            public UUID getItemId() {
                return id;
            }

            @Override
            public String getItemName() {
                return name;
            }

            @Override
            public LocalDate getWasteDate() {
                return date;
            }

            @Override
            public BigDecimal getTotalCost() {
                return new BigDecimal(cost);
            }
        };
    }

    private static ItemCostAggregate item(UUID id, String name, String cost) {
        return new ItemCostAggregate() {
            @Override
            public UUID getItemId() {
                return id;
            }

            @Override
            public String getItemName() {
                return name;
            }

            @Override
            public ItemUnit getUnit() {
                return ItemUnit.LB;
            }

            @Override
            public BigDecimal getTotalCost() {
                return new BigDecimal(cost);
            }

            @Override
            public BigDecimal getTotalQuantity() {
                return BigDecimal.ONE;
            }

            @Override
            public long getEntryCount() {
                return 1;
            }
        };
    }

    private static ReasonCostAggregate reason(WasteReason reason, String cost, long count) {
        return new ReasonCostAggregate() {
            @Override
            public WasteReason getReason() {
                return reason;
            }

            @Override
            public BigDecimal getTotalCost() {
                return new BigDecimal(cost);
            }

            @Override
            public long getEntryCount() {
                return count;
            }
        };
    }
}
