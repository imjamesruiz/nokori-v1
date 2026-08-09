package app.nokori.api.waste;

import java.math.BigDecimal;

public interface ReasonCostAggregate {
    WasteReason getReason();

    BigDecimal getTotalCost();

    long getEntryCount();
}
