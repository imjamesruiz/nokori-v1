package app.nokori.api.report;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.report.dto.WeeklyReportResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports")
@Validated
public class WeeklyReportController {

    private final WeeklyReportService reportService;

    public WeeklyReportController(WeeklyReportService reportService) {
        this.reportService = reportService;
    }

    /** Defaults to last week — the report the Monday push notification links to (PRD F-007). */
    @GetMapping("/weekly")
    public WeeklyReportResponse weekly(@AuthenticationPrincipal AuthPrincipal principal,
                                       @RequestParam(defaultValue = "1") @Min(0) @Max(52) int weeksAgo) {
        return reportService.weekly(principal, weeksAgo);
    }
}
