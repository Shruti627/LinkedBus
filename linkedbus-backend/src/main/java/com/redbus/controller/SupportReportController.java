package com.redbus.controller;

import com.redbus.dto.SupportReportDTO;
import com.redbus.model.SupportReport;
import com.redbus.service.SupportReportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/support")
@CrossOrigin(origins = "*")
public class SupportReportController {

    private static final Logger log = LoggerFactory.getLogger(SupportReportController.class);
    private final SupportReportService supportReportService;

    public SupportReportController(SupportReportService supportReportService) {
        this.supportReportService = supportReportService;
    }

    @PostMapping("/report")
    public ResponseEntity<?> createReport(@RequestBody @Valid SupportReportDTO dto) {
        try {
            SupportReport saved = supportReportService.saveReport(dto);
            // return 201 with location
            URI location = URI.create("/api/support/report/" + saved.getId());
            return ResponseEntity.created(location).body(Map.of(
                    "id", saved.getId(),
                    "message", "Report received and saved",
                    "emailNotified", true
            ));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid support report payload: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid data", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to save support report", e);
            return ResponseEntity.status(500).body(Map.of("error", "Server error", "message", e.getMessage()));
        }
    }
}
