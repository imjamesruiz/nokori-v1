package app.nokori.api.waste.dto;

import app.nokori.api.waste.WasteReason;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record WasteEntryRequest(
        @NotNull UUID inventoryItemId,
        @NotNull
        @DecimalMin(value = "0.001", message = "Quantity must be greater than zero.")
        @DecimalMax(value = "10000", message = "Quantity must be 10,000 or less.")
        @Digits(integer = 5, fraction = 3)
        BigDecimal quantity,
        @NotNull WasteReason reason,
        LocalDate wasteDate,
        @Size(max = 500) String note,
        /* Client-generated id so an offline replay creates the entry once (PRD F-012). */
        UUID clientUuid) {
}
