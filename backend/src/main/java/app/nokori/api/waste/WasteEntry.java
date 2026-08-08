package app.nokori.api.waste;

import app.nokori.api.inventory.ItemUnit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "waste_entries")
public class WasteEntry {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "inventory_item_id", nullable = false)
    private UUID inventoryItemId;

    @Column(name = "quantity_wasted", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityWasted;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit", nullable = false)
    private ItemUnit unit;

    /** Cost snapshot: editing the item's price later must not rewrite history (PRD F-003). */
    @Column(name = "cost_per_unit_at_time", nullable = false, precision = 10, scale = 4)
    private BigDecimal costPerUnitAtTime;

    @Column(name = "total_cost_lost", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCostLost;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false)
    private WasteReason reason;

    @Column(name = "note")
    private String note;

    @Column(name = "photo_key")
    private String photoKey;

    @Column(name = "waste_date", nullable = false)
    private LocalDate wasteDate;

    @Column(name = "created_by")
    private UUID createdBy;

    /** Client-generated id used to make offline replays idempotent (PRD F-012). */
    @Column(name = "client_uuid", updatable = false)
    private UUID clientUuid;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected WasteEntry() {
    }

    public WasteEntry(UUID businessId, UUID inventoryItemId, BigDecimal quantityWasted, ItemUnit unit,
                      BigDecimal costPerUnitAtTime, WasteReason reason, LocalDate wasteDate,
                      UUID createdBy, String note, UUID clientUuid) {
        this.businessId = businessId;
        this.inventoryItemId = inventoryItemId;
        this.quantityWasted = quantityWasted;
        this.unit = unit;
        this.costPerUnitAtTime = costPerUnitAtTime;
        this.totalCostLost = computeCost(quantityWasted, costPerUnitAtTime);
        this.reason = reason;
        this.wasteDate = wasteDate;
        this.createdBy = createdBy;
        this.note = note;
        this.clientUuid = clientUuid;
    }

    /** Single source of truth for the money math; always computed server-side (PRD F-004). */
    public static BigDecimal computeCost(BigDecimal quantity, BigDecimal costPerUnit) {
        return quantity.multiply(costPerUnit).setScale(2, RoundingMode.HALF_UP);
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void applyEdit(BigDecimal quantityWasted, WasteReason reason, LocalDate wasteDate, String note) {
        this.quantityWasted = quantityWasted;
        this.totalCostLost = computeCost(quantityWasted, this.costPerUnitAtTime);
        this.reason = reason;
        this.wasteDate = wasteDate;
        this.note = note;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public UUID getInventoryItemId() {
        return inventoryItemId;
    }

    public BigDecimal getQuantityWasted() {
        return quantityWasted;
    }

    public ItemUnit getUnit() {
        return unit;
    }

    public BigDecimal getCostPerUnitAtTime() {
        return costPerUnitAtTime;
    }

    public BigDecimal getTotalCostLost() {
        return totalCostLost;
    }

    public WasteReason getReason() {
        return reason;
    }

    public String getNote() {
        return note;
    }

    public String getPhotoKey() {
        return photoKey;
    }

    public void setPhotoKey(String photoKey) {
        this.photoKey = photoKey;
    }

    public LocalDate getWasteDate() {
        return wasteDate;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getClientUuid() {
        return clientUuid;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }
}
