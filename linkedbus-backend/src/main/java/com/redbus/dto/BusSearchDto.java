package com.redbus.dto;

import java.time.LocalDate;

public record BusSearchDto(
    Long id,
    String busName,
    String busType,
    String source,
    String destination,
    String departureTime,
    String arrivalTime,
    LocalDate departureDate,
    double price
) {}
