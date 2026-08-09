package app.nokori.api.inventory.dto;

import app.nokori.api.inventory.ItemCategory;
import app.nokori.api.inventory.ItemUnit;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record InventoryItemRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull ItemCategory category,
        @NotNull ItemUnit unit,
        @NotNull
        @DecimalMin(value = "0.0", message = "Cost cannot be negative.")
        @DecimalMax(value = "999999.9999", message = "Cost is too large.")
        @Digits(integer = 6, fraction = 4)
        BigDecimal costPerUnit,
        Boolean active) {

    public boolean activeOrDefault() {
        return active == null || active;
    }
}
