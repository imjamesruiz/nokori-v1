package app.nokori.api.inventory;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.inventory.dto.InventoryItemRequest;
import app.nokori.api.inventory.dto.InventoryItemResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
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
@RequestMapping("/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public List<InventoryItemResponse> list(@AuthenticationPrincipal AuthPrincipal principal,
                                            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return inventoryService.list(principal, includeInactive);
    }

    @PostMapping
    public ResponseEntity<InventoryItemResponse> create(@AuthenticationPrincipal AuthPrincipal principal,
                                                        @Valid @RequestBody InventoryItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryService.create(principal, request));
    }

    @PutMapping("/{id}")
    public InventoryItemResponse update(@AuthenticationPrincipal AuthPrincipal principal,
                                        @PathVariable UUID id,
                                        @Valid @RequestBody InventoryItemRequest request) {
        return inventoryService.update(principal, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable UUID id) {
        inventoryService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}
