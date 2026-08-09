package app.nokori.api.business.dto;

import app.nokori.api.business.BusinessType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BusinessRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull BusinessType businessType,
        @Size(max = 120) String city,
        @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a 3-letter code such as USD.") String currency,
        @NotBlank String timezone) {

    public String currencyOrDefault() {
        return currency == null || currency.isBlank() ? "USD" : currency;
    }
}
