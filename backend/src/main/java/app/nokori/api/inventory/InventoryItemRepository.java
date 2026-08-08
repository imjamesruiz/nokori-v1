package app.nokori.api.inventory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {

    /** Ownership is enforced by pairing the id with the caller's business id (PRD section 11.1). */
    Optional<InventoryItem> findByIdAndBusinessId(UUID id, UUID businessId);

    List<InventoryItem> findByBusinessIdOrderByCategoryAscNameAsc(UUID businessId);

    List<InventoryItem> findByBusinessIdAndActiveTrueOrderByCategoryAscNameAsc(UUID businessId);

    List<InventoryItem> findByBusinessIdAndIdIn(UUID businessId, List<UUID> ids);

    List<InventoryItem> findByBusinessIdAndCategory(UUID businessId, ItemCategory category);

    boolean existsByBusinessIdAndNameIgnoreCase(UUID businessId, String name);

    boolean existsByBusinessIdAndNameIgnoreCaseAndIdNot(UUID businessId, String name, UUID id);

    long countByBusinessIdAndActiveTrue(UUID businessId);

    @Transactional
    void deleteByBusinessId(UUID businessId);
}
