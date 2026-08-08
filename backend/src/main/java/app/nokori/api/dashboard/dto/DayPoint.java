package app.nokori.api.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DayPoint(LocalDate date, String label, BigDecimal cost, long entryCount) {
}
