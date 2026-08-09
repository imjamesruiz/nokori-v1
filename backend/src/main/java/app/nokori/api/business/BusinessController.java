package app.nokori.api.business;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.business.dto.BusinessRequest;
import app.nokori.api.business.dto.BusinessResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/businesses")
public class BusinessController {

    private final BusinessService businessService;

    public BusinessController(BusinessService businessService) {
        this.businessService = businessService;
    }

    @PostMapping
    public ResponseEntity<BusinessResponse> create(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BusinessRequest request,
            @RequestParam(defaultValue = "true") boolean seedStarterItems) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(businessService.create(principal, request, seedStarterItems));
    }

    @GetMapping("/me")
    public BusinessResponse me(@AuthenticationPrincipal AuthPrincipal principal) {
        return businessService.get(principal);
    }

    @PutMapping("/me")
    public BusinessResponse update(@AuthenticationPrincipal AuthPrincipal principal,
                                   @Valid @RequestBody BusinessRequest request) {
        return businessService.update(principal, request);
    }
}
