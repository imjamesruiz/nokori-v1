package app.nokori.api.waste;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.inventory.ItemCategory;
import app.nokori.api.waste.dto.WasteEntryFilter;
import app.nokori.api.waste.dto.WasteEntryRequest;
import app.nokori.api.waste.dto.WasteEntryResponse;
import app.nokori.api.waste.dto.WasteEntryUpdateRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/waste-entries")
public class WasteController {

    private final WasteService wasteService;

    public WasteController(WasteService wasteService) {
        this.wasteService = wasteService;
    }

    @PostMapping
    public ResponseEntity<WasteEntryResponse> create(@AuthenticationPrincipal AuthPrincipal principal,
                                                     @Valid @RequestBody WasteEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(wasteService.create(principal, request));
    }

    @GetMapping
    public Page<WasteEntryResponse> search(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID itemId,
            @RequestParam(required = false) ItemCategory category,
            @RequestParam(required = false) WasteReason reason,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return wasteService.search(principal, new WasteEntryFilter(from, to, itemId, category, reason), page, size);
    }

    @PutMapping("/{id}")
    public WasteEntryResponse update(@AuthenticationPrincipal AuthPrincipal principal,
                                     @PathVariable UUID id,
                                     @Valid @RequestBody WasteEntryUpdateRequest request) {
        return wasteService.update(principal, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable UUID id) {
        wasteService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}
