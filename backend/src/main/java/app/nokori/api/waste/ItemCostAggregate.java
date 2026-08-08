package app.nokori.api.waste;

import app.nokori.api.inventory.ItemUnit;
import java.math.BigDecimal;
import java.util.UUID;

public interface ItemCostAggregate {
    UUID getItemId();

    String getItemName();

    ItemUnit getUnit();

    BigDecimal getTotalCost();

    BigDecimal getTotalQuantity();

    long getEntryCount();
}
