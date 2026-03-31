package com.redbus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

/**
 * Request body for POST /api/support/report
 *
 * Example JSON:
 * {
 *   "subject": "Problem with booking 39",
 *   "description": "Payment succeeded but booking failed...",
 *   "metadata": { "logs": [...], "fetches": [...] },
 *   "url": "http://app/bookings/39",
 *   "userAgent": "Mozilla/5.0 ...",
 *   "user": { "id": 7, "name": "sahil", ... }
 * }
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SupportReportDTO(
    String subject,
    String description,
    Object metadata,   // accept arbitrary JSON; we'll store as string
    String url,
    String userAgent,
    Object user
) {}
