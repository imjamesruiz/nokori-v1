package app.nokori.api.common;

import java.util.Map;

/** Uniform error body: {"code": "...", "message": "...", "fieldErrors": {...}}. */
public record ApiError(String code, String message, Map<String, String> fieldErrors) {

    public static ApiError of(String code, String message) {
        return new ApiError(code, message, null);
    }
}
