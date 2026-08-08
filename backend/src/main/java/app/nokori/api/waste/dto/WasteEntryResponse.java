package app.nokori.api.waste.dto;

import app.nokori.api.inventory.InventoryItem;
import app.nokori.api.inventory.ItemCategory;
import app.nokori.api.inventory.ItemUnit;
import app.nokori.api.waste.WasteEntry;
import app.nokori.api.waste.WasteReason;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WasteEntryResponse(
        UUID id,
        UUID inventoryItemId,
        String itemName,
        ItemCategory category,
        BigDecimal quantity,
        ItemUnit unit,
        BigDecimal costPerUnit,
        BigDecimal totalCostLost,
        WasteReason reason,
        String reasonLabel,
        LocalDate wasteDate,
        String note,
        Instant createdAt) {

    public static WasteEntryResponse from(WasteEntry entry, InventoryItem item) {
        return new WasteEntryResponse(
                entry.getId(),
                entry.getInventoryItemId(),
                item != null ? item.getName() : "(deleted item)",
                item != null ? item.getCategory() : ItemCategory.OTHER,
                entry.getQuantityWasted(),
                entry.getUnit(),
                entry.getCostPerUnitAtTime(),
                entry.getTotalCostLost(),
                entry.getReason(),
                entry.getReason().label(),
                entry.getWasteDate(),
                entry.getNote(),
                entry.getCreatedAt());
    }
}
