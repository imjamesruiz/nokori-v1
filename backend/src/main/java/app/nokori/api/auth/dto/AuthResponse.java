package app.nokori.api.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresInSeconds,
        MeResponse user) {

    public static AuthResponse of(String accessToken, String refreshToken, long expiresInSeconds, MeResponse user) {
        return new AuthResponse(accessToken, refreshToken, "Bearer", expiresInSeconds, user);
    }
}
