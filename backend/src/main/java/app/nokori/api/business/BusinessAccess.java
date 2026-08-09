package app.nokori.api.business;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.common.ApiException;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single place that turns "who is calling" into "which business's rows may they touch".
 * Every business-scoped query goes through this so no controller can read a business id
 * off the request (PRD section 11.1).
 */
@Component
public class BusinessAccess {

    private final BusinessRepository businesses;

    public BusinessAccess(BusinessRepository businesses) {
        this.businesses = businesses;
    }

    @Transactional(readOnly = true)
    public Business require(AuthPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication required.");
        }
        return businesses.findByOwnerUserId(principal.userId())
                .orElseThrow(() -> new ApiException(
                        org.springframework.http.HttpStatus.CONFLICT,
                        "business_required",
                        "Finish setting up your business first."));
    }

    @Transactional(readOnly = true)
    public UUID requireId(AuthPrincipal principal) {
        return require(principal).getId();
    }
}
