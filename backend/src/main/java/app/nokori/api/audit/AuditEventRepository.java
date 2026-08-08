package app.nokori.api.audit;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    @Transactional
    void deleteByBusinessId(UUID businessId);

    @Transactional
    void deleteByUserId(UUID userId);
}
