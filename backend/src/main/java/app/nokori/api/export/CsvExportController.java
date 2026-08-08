package app.nokori.api.export;

import app.nokori.api.auth.AuthPrincipal;
import app.nokori.api.inventory.ItemCategory;
import app.nokori.api.waste.WasteReason;
import app.nokori.api.waste.WasteService;
import app.nokori.api.waste.dto.WasteEntryFilter;
import app.nokori.api.waste.dto.WasteEntryResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/exports")
public class CsvExportController {

    private static final int MAX_ROWS = 10_000;
    /** Excel only reads UTF-8 CSV correctly when it starts with a byte-order mark (PRD F-008). */
    private static final String BOM = "﻿";
    private static final String HEADER =
            "date,item,category,quantity,unit,cost_per_unit,total_cost_lost,reason,note";

    private final WasteService wasteService;

    public CsvExportController(WasteService wasteService) {
        this.wasteService = wasteService;
    }

    @GetMapping(value = "/waste.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportWaste(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID itemId,
            @RequestParam(required = false) ItemCategory category,
            @RequestParam(required = false) WasteReason reason) {

        List<WasteEntryResponse> rows = wasteService.export(
                principal, new WasteEntryFilter(from, to, itemId, category, reason), MAX_ROWS);

        StringBuilder csv = new StringBuilder(BOM).append(HEADER).append('\n');
        for (WasteEntryResponse row : rows) {
            csv.append(row.wasteDate()).append(',')
                    .append(escape(row.itemName())).append(',')
                    .append(row.category()).append(',')
                    .append(row.quantity().toPlainString()).append(',')
                    .append(row.unit()).append(',')
                    .append(row.costPerUnit().toPlainString()).append(',')
                    .append(row.totalCostLost().toPlainString()).append(',')
                    .append(escape(row.reasonLabel())).append(',')
                    .append(escape(row.note()))
                    .append('\n');
        }

        String filename = "nokori-waste-"
                + (from != null ? from : "all") + "-to-" + (to != null ? to : "today") + ".csv";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String escape(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
