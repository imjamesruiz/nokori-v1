package app.nokori.api.auth;

import java.util.UUID;

/** The authenticated caller, extracted from a validated access token. */
public record AuthPrincipal(UUID userId, String email) {
}
