package app.nokori.api.dashboard;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.dashboard.dto.DashboardSummaryResponse;
import app.nokori.api.dashboard.dto.DayPoint;
import app.nokori.api.dashboard.dto.ItemCostPoint;
import app.nokori.api.dashboard.dto.ReasonSlice;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@Validated
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /** {@code weeksAgo=0} is the current week; the app's week selector looks back up to 12. */
    @GetMapping("/summary")
    public DashboardSummaryResponse summary(@AuthenticationPrincipal AuthPrincipal principal,
                                            @RequestParam(defaultValue = "0") @Min(0) @Max(52) int weeksAgo) {
        return dashboardService.summary(principal, weeksAgo);
    }

    @GetMapping("/top-items")
    public List<ItemCostPoint> topItems(@AuthenticationPrincipal AuthPrincipal principal,
                                        @RequestParam(defaultValue = "0") @Min(0) @Max(52) int weeksAgo,
                                        @RequestParam(defaultValue = "5") @Min(1) @Max(50) int limit) {
        return dashboardService.topItems(principal, weeksAgo, limit);
    }

    @GetMapping("/by-reason")
    public List<ReasonSlice> byReason(@AuthenticationPrincipal AuthPrincipal principal,
                                      @RequestParam(defaultValue = "0") @Min(0) @Max(52) int weeksAgo) {
        return dashboardService.byReason(principal, weeksAgo);
    }

    @GetMapping("/by-day")
    public List<DayPoint> byDay(@AuthenticationPrincipal AuthPrincipal principal,
                                @RequestParam(defaultValue = "0") @Min(0) @Max(52) int weeksAgo) {
        return dashboardService.byDay(principal, weeksAgo);
    }
}
