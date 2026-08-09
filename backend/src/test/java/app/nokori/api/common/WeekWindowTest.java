package app.nokori.api.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WeekWindowTest {

    @Test
    @DisplayName("A week runs Monday through Sunday (PRD F-002 acceptance criteria)")
    void windowRunsMondayToSunday() {
        // 2026-08-07 is a Friday.
        WeekWindow window = WeekWindow.containing(LocalDate.of(2026, 8, 7));
        assertThat(window.start()).isEqualTo(LocalDate.of(2026, 8, 3));
        assertThat(window.end()).isEqualTo(LocalDate.of(2026, 8, 9));
    }

    @Test
    void mondayIsTheFirstDayOfItsOwnWeek() {
        WeekWindow window = WeekWindow.containing(LocalDate.of(2026, 8, 3));
        assertThat(window.start()).isEqualTo(LocalDate.of(2026, 8, 3));
    }

    @Test
    void sundayStillBelongsToTheWeekThatStartedMonday() {
        WeekWindow window = WeekWindow.containing(LocalDate.of(2026, 8, 9));
        assertThat(window.start()).isEqualTo(LocalDate.of(2026, 8, 3));
        assertThat(window.end()).isEqualTo(LocalDate.of(2026, 8, 9));
    }

    @Test
    void previousWeekIsTheSevenDaysBefore() {
        WeekWindow previous = WeekWindow.containing(LocalDate.of(2026, 8, 7)).previous();
        assertThat(previous.start()).isEqualTo(LocalDate.of(2026, 7, 27));
        assertThat(previous.end()).isEqualTo(LocalDate.of(2026, 8, 2));
    }

    @Test
    void closedOnlyOnceTheWeekHasEnded() {
        WeekWindow window = WeekWindow.containing(LocalDate.of(2026, 8, 7));
        assertThat(window.isClosedOn(LocalDate.of(2026, 8, 9))).isFalse();
        assertThat(window.isClosedOn(LocalDate.of(2026, 8, 10))).isTrue();
    }

    @Test
    void containsOnlyItsOwnDays() {
        WeekWindow window = WeekWindow.containing(LocalDate.of(2026, 8, 7));
        assertThat(window.contains(LocalDate.of(2026, 8, 3))).isTrue();
        assertThat(window.contains(LocalDate.of(2026, 8, 9))).isTrue();
        assertThat(window.contains(LocalDate.of(2026, 8, 2))).isFalse();
        assertThat(window.contains(LocalDate.of(2026, 8, 10))).isFalse();
    }
}
