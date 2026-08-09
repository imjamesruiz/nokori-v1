package app.nokori.api.auth.dto;

import java.util.UUID;

/** {@code hasBusiness} tells the app whether to route to onboarding or Home (PRD F-002). */
public record MeResponse(UUID userId, String email, boolean hasBusiness, UUID businessId) {
}
