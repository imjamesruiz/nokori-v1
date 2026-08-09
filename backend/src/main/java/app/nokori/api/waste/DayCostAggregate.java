package app.nokori.api.waste;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface DayCostAggregate {
    LocalDate getWasteDate();

    BigDecimal getTotalCost();

    long getEntryCount();
}
