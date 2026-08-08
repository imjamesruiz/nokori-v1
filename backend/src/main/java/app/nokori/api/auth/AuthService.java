package app.nokori.api.auth;

import app.nokori.api.audit.AuditEventRepository;
import app.nokori.api.auth.dto.AuthResponse;
import app.nokori.api.auth.dto.LoginRequest;
import app.nokori.api.auth.dto.MeResponse;
import app.nokori.api.auth.dto.RefreshRequest;
import app.nokori.api.auth.dto.RegisterRequest;
import app.nokori.api.business.Business;
import app.nokori.api.business.BusinessRepository;
import app.nokori.api.common.ApiException;
import app.nokori.api.inventory.InventoryItemRepository;
import app.nokori.api.report.WeeklyReportSnapshotRepository;
import app.nokori.api.user.User;
import app.nokori.api.user.UserRepository;
import app.nokori.api.waste.WasteEntryRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final BusinessRepository businesses;
    private final InventoryItemRepository inventoryItems;
    private final WasteEntryRepository wasteEntries;
    private final WeeklyReportSnapshotRepository snapshots;
    private final AuditEventRepository auditEvents;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users,
                       BusinessRepository businesses,
                       InventoryItemRepository inventoryItems,
                       WasteEntryRepository wasteEntries,
                       WeeklyReportSnapshotRepository snapshots,
                       AuditEventRepository auditEvents,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.users = users;
        this.businesses = businesses;
        this.inventoryItems = inventoryItems;
        this.wasteEntries = wasteEntries;
        this.snapshots = snapshots;
        this.auditEvents = auditEvents;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("email_taken", "An account with that email already exists.");
        }
        User user = users.save(new User(email, passwordEncoder.encode(request.password())));
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Optional<User> found = users.findByEmailIgnoreCase(request.email().trim());
        // Same response whether the email is unknown or the password is wrong (PRD F-001).
        User user = found.filter(u -> passwordEncoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> ApiException.unauthorized("Incorrect email or password."));
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshRequest request) {
        AuthPrincipal principal = jwtService.parseRefreshToken(request.refreshToken());
        User user = users.findById(principal.userId())
                .orElseThrow(() -> ApiException.unauthorized("Your session expired. Please log in again."));
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public MeResponse me(AuthPrincipal principal) {
        User user = users.findById(principal.userId())
                .orElseThrow(() -> ApiException.unauthorized("Your session expired. Please log in again."));
        return describe(user);
    }

    /** Apple requires in-app account deletion for any app with account creation (PRD 13.3, guideline 5.1.1(v)). */
    @Transactional
    public void deleteAccount(AuthPrincipal principal) {
        User user = users.findById(principal.userId())
                .orElseThrow(() -> ApiException.notFound("Account"));

        businesses.findByOwnerUserId(user.getId()).ifPresent(business -> {
            UUID businessId = business.getId();
            // Ordered so the waste -> inventory foreign key never blocks the delete.
            wasteEntries.deleteByBusinessId(businessId);
            inventoryItems.deleteByBusinessId(businessId);
            snapshots.deleteByBusinessId(businessId);
            auditEvents.deleteByBusinessId(businessId);
            businesses.delete(business);
        });
        auditEvents.deleteByUserId(user.getId());
        users.delete(user);
    }

    private AuthResponse issueTokens(User user) {
        String access = jwtService.createAccessToken(user.getId(), user.getEmail());
        String refresh = jwtService.createRefreshToken(user.getId(), user.getEmail());
        return AuthResponse.of(access, refresh, jwtService.accessTokenSeconds(), describe(user));
    }

    private MeResponse describe(User user) {
        Optional<Business> business = businesses.findByOwnerUserId(user.getId());
        return new MeResponse(user.getId(), user.getEmail(), business.isPresent(),
                business.map(Business::getId).orElse(null));
    }
}
