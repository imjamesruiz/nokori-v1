package app.nokori.api.report;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Freezes each business's closed week into a snapshot (PRD F-007). Runs hourly rather than
 * once a week so it lands soon after Monday 00:00 in every business timezone and recovers
 * on its own if an instance was down.
 *
 * <p>Single-instance assumption for the MVP. Before scaling past one task, move this behind a
 * database advisory lock or ShedLock.
 */
@Component
public class WeeklyReportScheduler {

    private static final Logger log = LoggerFactory.getLogger(WeeklyReportScheduler.class);

    private final WeeklyReportService reportService;
    private final boolean enabled;

    public WeeklyReportScheduler(WeeklyReportService reportService,
                                 @Value("${nokori.reports.scheduler-enabled:true}") boolean enabled) {
        this.reportService = reportService;
        this.enabled = enabled;
    }

    @Scheduled(cron = "0 5 * * * *")
    public void snapshotClosedWeeks() {
        if (!enabled) {
            return;
        }
        try {
            int written = reportService.snapshotClosedWeeks();
            if (written > 0) {
                log.info("Wrote {} weekly report snapshot(s)", written);
            }
        } catch (RuntimeException ex) {
            log.error("Weekly snapshot job failed", ex);
        }
    }
}
