package app.nokori.api.report;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface WeeklyReportSnapshotRepository extends JpaRepository<WeeklyReportSnapshot, UUID> {

    Optional<WeeklyReportSnapshot> findByBusinessIdAndWeekStart(UUID businessId, LocalDate weekStart);

    List<WeeklyReportSnapshot> findTop12ByBusinessIdOrderByWeekStartDesc(UUID businessId);

    @Transactional
    void deleteByBusinessId(UUID businessId);
}
