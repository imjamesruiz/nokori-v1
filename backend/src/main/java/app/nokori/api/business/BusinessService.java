package app.nokori.api.business;

import app.nokori.api.audit.AuditService;
import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.business.dto.BusinessRequest;
import app.nokori.api.business.dto.BusinessResponse;
import app.nokori.api.common.ApiException;
import app.nokori.api.inventory.InventoryItemRepository;
import app.nokori.api.inventory.StarterTemplates;
import java.time.DateTimeException;
import java.time.ZoneId;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessService {

    private final BusinessRepository businesses;
    private final InventoryItemRepository inventoryItems;
    private final BusinessAccess access;
    private final AuditService audit;

    public BusinessService(BusinessRepository businesses,
                           InventoryItemRepository inventoryItems,
                           BusinessAccess access,
                           AuditService audit) {
        this.businesses = businesses;
        this.inventoryItems = inventoryItems;
        this.access = access;
        this.audit = audit;
    }

    @Transactional
    public BusinessResponse create(AuthPrincipal principal, BusinessRequest request, boolean seedStarterItems) {
        if (businesses.existsByOwnerUserId(principal.userId())) {
            throw ApiException.conflict("business_exists", "You already have a business set up.");
        }
        Business business = businesses.save(new Business(
                principal.userId(),
                request.name().trim(),
                request.businessType(),
                trimToNull(request.city()),
                request.currencyOrDefault(),
                validateTimezone(request.timezone())));

        if (seedStarterItems) {
            inventoryItems.saveAll(StarterTemplates.forBusiness(business.getId(), business.getBusinessType()));
        }
        audit.record(business.getId(), principal.userId(), "business.created", "business", business.getId());
        return BusinessResponse.from(business);
    }

    @Transactional(readOnly = true)
    public BusinessResponse get(AuthPrincipal principal) {
        return BusinessResponse.from(access.require(principal));
    }

    @Transactional
    public BusinessResponse update(AuthPrincipal principal, BusinessRequest request) {
        Business business = access.require(principal);
        business.setName(request.name().trim());
        business.setBusinessType(request.businessType());
        business.setCity(trimToNull(request.city()));
        business.setCurrency(request.currencyOrDefault());
        business.setTimezone(validateTimezone(request.timezone()));
        Business saved = businesses.save(business);
        audit.record(saved.getId(), principal.userId(), "business.updated", "business", saved.getId());
        return BusinessResponse.from(saved);
    }

    private static String validateTimezone(String timezone) {
        try {
            return ZoneId.of(timezone.trim()).getId();
        } catch (DateTimeException ex) {
            throw ApiException.badRequest("invalid_timezone",
                    "'" + timezone + "' is not a valid timezone (expected an IANA id like America/Los_Angeles).");
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
