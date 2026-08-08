package app.nokori.api.waste.dto;

import app.nokori.api.inventory.ItemCategory;
import app.nokori.api.waste.WasteReason;
import java.time.LocalDate;
import java.util.UUID;

/** Query parameters for waste history (PRD F-006). Any field may be null. */
public record WasteEntryFilter(
        LocalDate from,
        LocalDate to,
        UUID itemId,
        ItemCategory category,
        WasteReason reason) {
}
