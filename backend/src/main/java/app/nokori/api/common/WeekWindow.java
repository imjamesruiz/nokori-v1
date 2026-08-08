package app.nokori.api.common;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;

/**
 * A Monday-through-Sunday window in the business's own timezone. Waste dates are stored
 * as business-local dates, so all week math stays in {@link LocalDate} and never depends
 * on the server's default zone (PRD F-002).
 */
public record WeekWindow(LocalDate start, LocalDate end) {

    public static WeekWindow containing(LocalDate day) {
        LocalDate start = day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return new WeekWindow(start, start.plusDays(6));
    }

    public static WeekWindow current(ZoneId zone) {
        return containing(LocalDate.now(zone));
    }

    /** {@code weeksAgo = 0} is the current week, {@code 1} the week before it. */
    public static WeekWindow weeksAgo(ZoneId zone, int weeksAgo) {
        return containing(LocalDate.now(zone).minusWeeks(weeksAgo));
    }

    public WeekWindow previous() {
        return containing(start.minusWeeks(1));
    }

    public boolean isClosedOn(LocalDate today) {
        return end.isBefore(today);
    }

    public boolean contains(LocalDate day) {
        return !day.isBefore(start) && !day.isAfter(end);
    }
}
