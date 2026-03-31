
package com.redbus.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

public record BookingDTO(
    Long id,
    LocalDateTime bookingTime,
    String status,
    BigDecimal totalFare,
    BusDTO bus,
    List<SeatDTO> seats,
    UserDTO user,          
    PaymentDTO payment     
) {}
