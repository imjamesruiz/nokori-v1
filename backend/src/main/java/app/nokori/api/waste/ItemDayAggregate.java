package app.nokori.api.waste;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public interface ItemDayAggregate {
    UUID getItemId();

    String getItemName();

    LocalDate getWasteDate();

    BigDecimal getTotalCost();
}
