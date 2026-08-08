package app.nokori.api.business.dto;

import app.nokori.api.business.Business;
import app.nokori.api.business.BusinessType;
import java.time.Instant;
import java.util.UUID;

public record BusinessResponse(
        UUID id,
        String name,
        BusinessType businessType,
        String city,
        String currency,
        String timezone,
        Instant createdAt) {

    public static BusinessResponse from(Business business) {
        return new BusinessResponse(
                business.getId(),
                business.getName(),
                business.getBusinessType(),
                business.getCity(),
                business.getCurrency(),
                business.getTimezone(),
                business.getCreatedAt());
    }
}
