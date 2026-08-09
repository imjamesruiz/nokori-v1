package app.nokori.api.waste;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WasteCostTest {

    @Test
    @DisplayName("5 lb of $3.50/lb chicken costs $17.50 (PRD F-004 acceptance criteria)")
    void computesCostFromQuantityAndUnitCost() {
        BigDecimal cost = WasteEntry.computeCost(new BigDecimal("5"), new BigDecimal("3.50"));
        assertThat(cost).isEqualByComparingTo("17.50");
        assertThat(cost.scale()).isEqualTo(2);
    }

    @Test
    void roundsHalfUpToCents() {
        // 1.005 * 1 would round to 1.00 under HALF_EVEN; owners expect 1.01.
        assertThat(WasteEntry.computeCost(new BigDecimal("1.005"), BigDecimal.ONE))
                .isEqualByComparingTo("1.01");
        assertThat(WasteEntry.computeCost(new BigDecimal("2.333"), new BigDecimal("3.3333")))
                .isEqualByComparingTo("7.78");
    }

    @Test
    void handlesFractionalUnitCosts() {
        assertThat(WasteEntry.computeCost(new BigDecimal("12"), new BigDecimal("0.0825")))
                .isEqualByComparingTo("0.99");
    }
}
