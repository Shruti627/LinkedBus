// BusDTO.java
package com.redbus.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.math.BigDecimal;

public record BusDTO(
    Long id,
    String busName,
    String busType,
    String source,
    String destination,
    LocalTime departureTime, 
    LocalTime arrivalTime,
    LocalDate departureDate,
    BigDecimal price,        
    List<SeatDTO> seats
) {}
