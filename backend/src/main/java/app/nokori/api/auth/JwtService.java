package app.nokori.api.auth;

import app.nokori.api.common.ApiException;
import app.nokori.api.config.NokoriProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String TOKEN_TYPE_CLAIM = "typ";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";

    private final NokoriProperties properties;
    private SecretKey key;

    public JwtService(NokoriProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void init() {
        String secret = properties.getJwt().getSecret();
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "nokori.jwt.secret must be at least 32 bytes; set NOKORI_JWT_SECRET.");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
    }

    public String createAccessToken(UUID userId, String email) {
        return build(userId, email, ACCESS, Duration.ofMinutes(properties.getJwt().getAccessTokenMinutes()));
    }

    public String createRefreshToken(UUID userId, String email) {
        return build(userId, email, REFRESH, Duration.ofDays(properties.getJwt().getRefreshTokenDays()));
    }

    public long accessTokenSeconds() {
        return Duration.ofMinutes(properties.getJwt().getAccessTokenMinutes()).toSeconds();
    }

    /** Parses an access token. Returns null when the token is absent, malformed, expired, or the wrong type. */
    public AuthPrincipal parseAccessToken(String token) {
        try {
            Claims claims = claims(token);
            if (!ACCESS.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))) {
                return null;
            }
            return new AuthPrincipal(UUID.fromString(claims.getSubject()), claims.get("email", String.class));
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }

    /** Parses a refresh token, throwing 401 when it is not usable so the client routes to login. */
    public AuthPrincipal parseRefreshToken(String token) {
        try {
            Claims claims = claims(token);
            if (!REFRESH.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))) {
                throw ApiException.unauthorized("Invalid refresh token.");
            }
            return new AuthPrincipal(UUID.fromString(claims.getSubject()), claims.get("email", String.class));
        } catch (JwtException | IllegalArgumentException ex) {
            throw ApiException.unauthorized("Your session expired. Please log in again.");
        }
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    private String build(UUID userId, String email, String type, Duration ttl) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim(TOKEN_TYPE_CLAIM, type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }
}
