package app.nokori.api.waste;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface WasteEntryRepository
        extends JpaRepository<WasteEntry, UUID>, JpaSpecificationExecutor<WasteEntry> {

    Optional<WasteEntry> findByIdAndBusinessIdAndDeletedAtIsNull(UUID id, UUID businessId);

    Optional<WasteEntry> findByBusinessIdAndClientUuid(UUID businessId, UUID clientUuid);

    List<WasteEntry> findTop5ByBusinessIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID businessId);

    boolean existsByBusinessIdAndInventoryItemIdAndDeletedAtIsNull(UUID businessId, UUID inventoryItemId);

    @Query("""
            SELECT coalesce(sum(w.totalCostLost), 0) FROM WasteEntry w
            WHERE w.businessId = :businessId AND w.deletedAt IS NULL
              AND w.wasteDate BETWEEN :from AND :to
            """)
    BigDecimal sumCostBetween(@Param("businessId") UUID businessId,
                              @Param("from") LocalDate from,
                              @Param("to") LocalDate to);

    @Query("""
            SELECT count(w) FROM WasteEntry w
            WHERE w.businessId = :businessId AND w.deletedAt IS NULL
              AND w.wasteDate BETWEEN :from AND :to
            """)
    long countBetween(@Param("businessId") UUID businessId,
                      @Param("from") LocalDate from,
                      @Param("to") LocalDate to);

    @Query("""
            SELECT i.id AS itemId, i.name AS itemName, i.unit AS unit,
                   sum(w.totalCostLost) AS totalCost,
                   sum(w.quantityWasted) AS totalQuantity,
                   count(w) AS entryCount
            FROM WasteEntry w, InventoryItem i
            WHERE w.inventoryItemId = i.id
              AND w.businessId = :businessId AND w.deletedAt IS NULL
              AND w.wasteDate BETWEEN :from AND :to
            GROUP BY i.id, i.name, i.unit
            ORDER BY sum(w.totalCostLost) DESC
            """)
    List<ItemCostAggregate> aggregateByItem(@Param("businessId") UUID businessId,
                                            @Param("from") LocalDate from,
                                            @Param("to") LocalDate to);

    @Query("""
            SELECT w.reason AS reason, sum(w.totalCostLost) AS totalCost, count(w) AS entryCount
            FROM WasteEntry w
            WHERE w.businessId = :businessId AND w.deletedAt IS NULL
              AND w.wasteDate BETWEEN :from AND :to
            GROUP BY w.reason
            ORDER BY sum(w.totalCostLost) DESC
            """)
    List<ReasonCostAggregate> aggregateByReason(@Param("businessId") UUID businessId,
                                                @Param("from") LocalDate from,
                                                @Param("to") LocalDate to);

    @Query("""
            SELECT w.wasteDate AS wasteDate, sum(w.totalCostLost) AS totalCost, count(w) AS entryCount
            FROM WasteEntry w
            WHERE w.businessId = :businessId AND w.deletedAt IS NULL
              AND w.wasteDate BETWEEN :from AND :to
            GROUP BY w.wasteDate
            ORDER BY w.wasteDate ASC
            """)
    List<DayCostAggregate> aggregateByDay(@Param("businessId") UUID businessId,
                                          @Param("from") LocalDate from,
                                          @Param("to") LocalDate to);

    /** Item + day rollup that powers the day-specific recommendation rule (PRD F-010). */
    @Query("""
            SELECT i.id AS itemId, i.name AS itemName, w.wasteDate AS wasteDate,
                   sum(w.totalCostLost) AS totalCost
            FROM WasteEntry w, InventoryItem i
            WHERE w.inventoryItemId = i.id
              AND w.businessId = :businessId AND w.deletedAt IS NULL
              AND w.wasteDate BETWEEN :from AND :to
            GROUP BY i.id, i.name, w.wasteDate
            """)
    List<ItemDayAggregate> aggregateByItemAndDay(@Param("businessId") UUID businessId,
                                                 @Param("from") LocalDate from,
                                                 @Param("to") LocalDate to);

    @Transactional
    void deleteByBusinessId(UUID businessId);
}
