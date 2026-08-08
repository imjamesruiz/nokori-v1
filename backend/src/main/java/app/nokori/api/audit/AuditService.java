package app.nokori.api.audit;

import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditEventRepository repository;

    public AuditService(AuditEventRepository repository) {
        this.repository = repository;
    }

    public void record(UUID businessId, UUID userId, String action, String entityType, UUID entityId) {
        repository.save(new AuditEvent(businessId, userId, action, entityType, entityId));
    }
}
