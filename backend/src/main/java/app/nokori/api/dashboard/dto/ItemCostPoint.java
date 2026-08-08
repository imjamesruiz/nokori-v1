package app.nokori.api.dashboard.dto;

import app.nokori.api.inventory.ItemUnit;
import java.math.BigDecimal;
import java.util.UUID;

public record ItemCostPoint(UUID itemId, String name, BigDecimal cost, BigDecimal quantity,
                            ItemUnit unit, long entryCount) {
}
