// SeatDTO.java
package com.redbus.dto;

import java.math.BigDecimal;

public record SeatDTO(
    Long id,
    String seatNumber,
    boolean booked,
    BigDecimal price
) {}
