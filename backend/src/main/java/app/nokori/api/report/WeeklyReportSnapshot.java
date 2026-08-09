package app.nokori.api.report;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Frozen copy of a closed week so historical reports never drift when entries
 * are edited later (PRD F-007).
 */
@Entity
@Table(name = "weekly_report_snapshots")
public class WeeklyReportSnapshot {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "business_id", nullable = false, updatable = false)
    private UUID businessId;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Column(name = "week_end", nullable = false)
    private LocalDate weekEnd;

    @Column(name = "total_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "previous_total_cost", precision = 12, scale = 2)
    private BigDecimal previousTotalCost;

    @Column(name = "entry_count", nullable = false)
    private int entryCount;

    @Column(name = "top_item_name")
    private String topItemName;

    @Column(name = "top_item_cost", precision = 12, scale = 2)
    private BigDecimal topItemCost;

    @Column(name = "top_reason")
    private String topReason;

    @Column(name = "worst_day")
    private String worstDay;

    @Column(name = "recommendation_text")
    private String recommendationText;

    @Column(name = "rule_id")
    private String ruleId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WeeklyReportSnapshot() {
    }

    public WeeklyReportSnapshot(UUID businessId, LocalDate weekStart, LocalDate weekEnd) {
        this.businessId = businessId;
        this.weekStart = weekStart;
        this.weekEnd = weekEnd;
        this.totalCost = BigDecimal.ZERO;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getBusinessId() {
        return businessId;
    }

    public LocalDate getWeekStart() {
        return weekStart;
    }

    public LocalDate getWeekEnd() {
        return weekEnd;
    }

    public BigDecimal getTotalCost() {
        return totalCost;
    }

    public void setTotalCost(BigDecimal totalCost) {
        this.totalCost = totalCost;
    }

    public BigDecimal getPreviousTotalCost() {
        return previousTotalCost;
    }

    public void setPreviousTotalCost(BigDecimal previousTotalCost) {
        this.previousTotalCost = previousTotalCost;
    }

    public int getEntryCount() {
        return entryCount;
    }

    public void setEntryCount(int entryCount) {
        this.entryCount = entryCount;
    }

    public String getTopItemName() {
        return topItemName;
    }

    public void setTopItemName(String topItemName) {
        this.topItemName = topItemName;
    }

    public BigDecimal getTopItemCost() {
        return topItemCost;
    }

    public void setTopItemCost(BigDecimal topItemCost) {
        this.topItemCost = topItemCost;
    }

    public String getTopReason() {
        return topReason;
    }

    public void setTopReason(String topReason) {
        this.topReason = topReason;
    }

    public String getWorstDay() {
        return worstDay;
    }

    public void setWorstDay(String worstDay) {
        this.worstDay = worstDay;
    }

    public String getRecommendationText() {
        return recommendationText;
    }

    public void setRecommendationText(String recommendationText) {
        this.recommendationText = recommendationText;
    }

    public String getRuleId() {
        return ruleId;
    }

    public void setRuleId(String ruleId) {
        this.ruleId = ruleId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
