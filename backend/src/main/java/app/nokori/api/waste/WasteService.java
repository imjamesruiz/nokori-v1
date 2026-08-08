package app.nokori.api.waste;

import app.nokori.api.audit.AuditService;
import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.business.Business;
import app.nokori.api.business.BusinessAccess;
import app.nokori.api.common.ApiException;
import app.nokori.api.inventory.InventoryItem;
import app.nokori.api.inventory.InventoryItemRepository;
import app.nokori.api.waste.dto.WasteEntryFilter;
import app.nokori.api.waste.dto.WasteEntryRequest;
import app.nokori.api.waste.dto.WasteEntryResponse;
import app.nokori.api.waste.dto.WasteEntryUpdateRequest;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WasteService {

    /** How far back a new entry may be dated — staff often log the morning after (PRD F-004). */
    private static final int MAX_BACKDATE_DAYS = 7;
    /** Entries stay editable for a month; older weeks are already frozen into report snapshots. */
    private static final int MAX_EDIT_AGE_DAYS = 30;

    private final WasteEntryRepository entries;
    private final InventoryItemRepository items;
    private final BusinessAccess access;
    private final AuditService audit;

    public WasteService(WasteEntryRepository entries,
                        InventoryItemRepository items,
                        BusinessAccess access,
                        AuditService audit) {
        this.entries = entries;
        this.items = items;
        this.access = access;
        this.audit = audit;
    }

    @Transactional
    public WasteEntryResponse create(AuthPrincipal principal, WasteEntryRequest request) {
        Business business = access.require(principal);
        UUID businessId = business.getId();

        // Replayed offline entries resolve to the original row instead of a duplicate.
        if (request.clientUuid() != null) {
            Optional<WasteEntry> existing = entries.findByBusinessIdAndClientUuid(businessId, request.clientUuid());
            if (existing.isPresent()) {
                return toResponse(existing.get(), lookup(businessId, existing.get().getInventoryItemId()));
            }
        }

        InventoryItem item = items.findByIdAndBusinessId(request.inventoryItemId(), businessId)
                .orElseThrow(() -> ApiException.notFound("Item"));
        if (!item.isActive()) {
            throw ApiException.unprocessable("item_inactive",
                    "\"" + item.getName() + "\" is no longer tracked. Reactivate it in Inventory to log waste against it.");
        }

        LocalDate today = LocalDate.now(business.zoneId());
        LocalDate wasteDate = request.wasteDate() == null ? today : request.wasteDate();
        if (wasteDate.isAfter(today)) {
            throw ApiException.badRequest("waste_date_future", "Waste cannot be logged for a future date.");
        }
        if (wasteDate.isBefore(today.minusDays(MAX_BACKDATE_DAYS))) {
            throw ApiException.badRequest("waste_date_too_old",
                    "Entries can be backdated up to " + MAX_BACKDATE_DAYS + " days.");
        }

        WasteEntry entry = new WasteEntry(
                businessId,
                item.getId(),
                request.quantity(),
                item.getUnit(),
                item.getCostPerUnit(),
                request.reason(),
                wasteDate,
                principal.userId(),
                trimToNull(request.note()),
                request.clientUuid());

        WasteEntry saved = entries.save(entry);
        audit.record(businessId, principal.userId(), "waste.created", "waste_entry", saved.getId());
        return toResponse(saved, item);
    }

    @Transactional(readOnly = true)
    public Page<WasteEntryResponse> search(AuthPrincipal principal, WasteEntryFilter filter, int page, int size) {
        UUID businessId = access.requireId(principal);

        List<UUID> categoryItemIds = null;
        if (filter.category() != null) {
            categoryItemIds = items.findByBusinessIdAndCategory(businessId, filter.category()).stream()
                    .map(InventoryItem::getId)
                    .toList();
            if (categoryItemIds.isEmpty()) {
                return Page.empty(PageRequest.of(page, size));
            }
        }

        Specification<WasteEntry> spec = specification(businessId, filter, categoryItemIds);
        PageRequest pageRequest = PageRequest.of(page, Math.min(size, 200),
                Sort.by(Sort.Direction.DESC, "wasteDate").and(Sort.by(Sort.Direction.DESC, "createdAt")));

        Page<WasteEntry> found = entries.findAll(spec, pageRequest);
        Map<UUID, InventoryItem> itemsById = loadItems(businessId, found.getContent());
        List<WasteEntryResponse> content = found.getContent().stream()
                .map(entry -> toResponse(entry, itemsById.get(entry.getInventoryItemId())))
                .toList();
        return new PageImpl<>(content, pageRequest, found.getTotalElements());
    }

    /** Unpaged read used by CSV export (PRD F-008); capped so one request cannot pull the whole table. */
    @Transactional(readOnly = true)
    public List<WasteEntryResponse> export(AuthPrincipal principal, WasteEntryFilter filter, int maxRows) {
        UUID businessId = access.requireId(principal);

        List<UUID> categoryItemIds = null;
        if (filter.category() != null) {
            categoryItemIds = items.findByBusinessIdAndCategory(businessId, filter.category()).stream()
                    .map(InventoryItem::getId)
                    .toList();
            if (categoryItemIds.isEmpty()) {
                return List.of();
            }
        }

        PageRequest pageRequest = PageRequest.of(0, maxRows,
                Sort.by(Sort.Direction.ASC, "wasteDate").and(Sort.by(Sort.Direction.ASC, "createdAt")));
        Page<WasteEntry> found = entries.findAll(specification(businessId, filter, categoryItemIds), pageRequest);
        Map<UUID, InventoryItem> itemsById = loadItems(businessId, found.getContent());
        return found.getContent().stream()
                .map(entry -> toResponse(entry, itemsById.get(entry.getInventoryItemId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WasteEntryResponse> recent(UUID businessId) {
        List<WasteEntry> found = entries.findTop5ByBusinessIdAndDeletedAtIsNullOrderByCreatedAtDesc(businessId);
        Map<UUID, InventoryItem> itemsById = loadItems(businessId, found);
        return found.stream()
                .map(entry -> toResponse(entry, itemsById.get(entry.getInventoryItemId())))
                .toList();
    }

    @Transactional
    public WasteEntryResponse update(AuthPrincipal principal, UUID entryId, WasteEntryUpdateRequest request) {
        Business business = access.require(principal);
        WasteEntry entry = entries.findByIdAndBusinessIdAndDeletedAtIsNull(entryId, business.getId())
                .orElseThrow(() -> ApiException.notFound("Entry"));

        if (entry.getCreatedAt().isBefore(Instant.now().minus(MAX_EDIT_AGE_DAYS, ChronoUnit.DAYS))) {
            throw ApiException.unprocessable("entry_too_old",
                    "Entries can only be edited within " + MAX_EDIT_AGE_DAYS + " days.");
        }
        LocalDate today = LocalDate.now(business.zoneId());
        if (request.wasteDate().isAfter(today)) {
            throw ApiException.badRequest("waste_date_future", "Waste cannot be logged for a future date.");
        }

        entry.applyEdit(request.quantity(), request.reason(), request.wasteDate(), trimToNull(request.note()));
        WasteEntry saved = entries.save(entry);
        audit.record(business.getId(), principal.userId(), "waste.updated", "waste_entry", saved.getId());
        return toResponse(saved, lookup(business.getId(), saved.getInventoryItemId()));
    }

    @Transactional
    public void delete(AuthPrincipal principal, UUID entryId) {
        UUID businessId = access.requireId(principal);
        WasteEntry entry = entries.findByIdAndBusinessIdAndDeletedAtIsNull(entryId, businessId)
                .orElseThrow(() -> ApiException.notFound("Entry"));
        entry.softDelete();
        entries.save(entry);
        audit.record(businessId, principal.userId(), "waste.deleted", "waste_entry", entryId);
    }

    private Specification<WasteEntry> specification(UUID businessId, WasteEntryFilter filter, List<UUID> itemIds) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("businessId"), businessId));
            predicates.add(cb.isNull(root.get("deletedAt")));
            if (filter.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("wasteDate"), filter.from()));
            }
            if (filter.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("wasteDate"), filter.to()));
            }
            if (filter.itemId() != null) {
                predicates.add(cb.equal(root.get("inventoryItemId"), filter.itemId()));
            }
            if (filter.reason() != null) {
                predicates.add(cb.equal(root.get("reason"), filter.reason()));
            }
            if (itemIds != null) {
                predicates.add(root.get("inventoryItemId").in(itemIds));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Map<UUID, InventoryItem> loadItems(UUID businessId, List<WasteEntry> entryList) {
        List<UUID> ids = entryList.stream().map(WasteEntry::getInventoryItemId).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return items.findByBusinessIdAndIdIn(businessId, ids).stream()
                .collect(Collectors.toMap(InventoryItem::getId, Function.identity()));
    }

    private InventoryItem lookup(UUID businessId, UUID itemId) {
        return items.findByIdAndBusinessId(itemId, businessId).orElse(null);
    }

    private WasteEntryResponse toResponse(WasteEntry entry, InventoryItem item) {
        return WasteEntryResponse.from(entry, item);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
