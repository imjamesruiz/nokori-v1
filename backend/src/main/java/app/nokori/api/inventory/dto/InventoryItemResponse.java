package app.nokori.api.inventory.dto;

import app.nokori.api.inventory.InventoryItem;
import app.nokori.api.inventory.ItemCategory;
import app.nokori.api.inventory.ItemUnit;
import java.math.BigDecimal;
import java.util.UUID;

public record InventoryItemResponse(
        UUID id,
        String name,
        ItemCategory category,
        ItemUnit unit,
        BigDecimal costPerUnit,
        boolean active) {

    public static InventoryItemResponse from(InventoryItem item) {
        return new InventoryItemResponse(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getUnit(),
                item.getCostPerUnit(),
                item.isActive());
    }
}
