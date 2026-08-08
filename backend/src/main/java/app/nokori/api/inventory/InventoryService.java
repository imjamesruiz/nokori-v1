package app.nokori.api.inventory;

import app.nokori.api.audit.AuditService;
import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.business.BusinessAccess;
import app.nokori.api.common.ApiException;
import app.nokori.api.inventory.dto.InventoryItemRequest;
import app.nokori.api.inventory.dto.InventoryItemResponse;
import app.nokori.api.waste.WasteEntryRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {

    private final InventoryItemRepository items;
    private final WasteEntryRepository wasteEntries;
    private final BusinessAccess access;
    private final AuditService audit;

    public InventoryService(InventoryItemRepository items,
                            WasteEntryRepository wasteEntries,
                            BusinessAccess access,
                            AuditService audit) {
        this.items = items;
        this.wasteEntries = wasteEntries;
        this.access = access;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<InventoryItemResponse> list(AuthPrincipal principal, boolean includeInactive) {
        UUID businessId = access.requireId(principal);
        List<InventoryItem> found = includeInactive
                ? items.findByBusinessIdOrderByCategoryAscNameAsc(businessId)
                : items.findByBusinessIdAndActiveTrueOrderByCategoryAscNameAsc(businessId);
        return found.stream().map(InventoryItemResponse::from).toList();
    }

    @Transactional
    public InventoryItemResponse create(AuthPrincipal principal, InventoryItemRequest request) {
        UUID businessId = access.requireId(principal);
        String name = request.name().trim();
        if (items.existsByBusinessIdAndNameIgnoreCase(businessId, name)) {
            throw ApiException.conflict("item_exists", "You already track an item called \"" + name + "\".");
        }
        InventoryItem item = items.save(new InventoryItem(
                businessId, name, request.category(), request.unit(), request.costPerUnit()));
        audit.record(businessId, principal.userId(), "inventory.created", "inventory_item", item.getId());
        return InventoryItemResponse.from(item);
    }

    @Transactional
    public InventoryItemResponse update(AuthPrincipal principal, UUID itemId, InventoryItemRequest request) {
        UUID businessId = access.requireId(principal);
        InventoryItem item = items.findByIdAndBusinessId(itemId, businessId)
                .orElseThrow(() -> ApiException.notFound("Item"));

        String name = request.name().trim();
        if (items.existsByBusinessIdAndNameIgnoreCaseAndIdNot(businessId, name, itemId)) {
            throw ApiException.conflict("item_exists", "You already track an item called \"" + name + "\".");
        }
        // Editing cost never rewrites history: entries keep the cost snapshot taken when logged.
        item.setName(name);
        item.setCategory(request.category());
        item.setUnit(request.unit());
        item.setCostPerUnit(request.costPerUnit());
        item.setActive(request.activeOrDefault());
        InventoryItem saved = items.save(item);
        audit.record(businessId, principal.userId(), "inventory.updated", "inventory_item", saved.getId());
        return InventoryItemResponse.from(saved);
    }

    /**
     * Soft-deletes items that already have waste history so reports stay intact (PRD F-003);
     * items never logged against are removed outright.
     */
    @Transactional
    public void delete(AuthPrincipal principal, UUID itemId) {
        UUID businessId = access.requireId(principal);
        InventoryItem item = items.findByIdAndBusinessId(itemId, businessId)
                .orElseThrow(() -> ApiException.notFound("Item"));

        if (wasteEntries.existsByBusinessIdAndInventoryItemIdAndDeletedAtIsNull(businessId, itemId)) {
            item.setActive(false);
            items.save(item);
            audit.record(businessId, principal.userId(), "inventory.deactivated", "inventory_item", itemId);
        } else {
            items.delete(item);
            audit.record(businessId, principal.userId(), "inventory.deleted", "inventory_item", itemId);
        }
    }
}
