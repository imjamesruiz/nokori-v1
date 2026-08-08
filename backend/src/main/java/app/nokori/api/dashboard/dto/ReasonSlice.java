package app.nokori.api.dashboard.dto;

import app.nokori.api.waste.WasteReason;
import java.math.BigDecimal;

public record ReasonSlice(WasteReason reason, String label, BigDecimal cost, BigDecimal share, long entryCount) {
}
