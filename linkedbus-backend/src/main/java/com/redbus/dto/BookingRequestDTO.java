// BookingRequestDTO.java
package com.redbus.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record BookingRequestDTO(
    @NotNull(message = "userId is required")
    Long userId,

    @NotNull(message = "busId is required")
    Long busId,

    @NotEmpty(message = "seatIds must contain at least one seat id")
    List<@NotNull(message = "seatId must not be null") Long> seatIds,

    @NotNull(message = "totalFare is required")
    @PositiveOrZero(message = "totalFare must be zero or positive")
    BigDecimal totalFare,

   
    String paymentId,         // razorpay_payment_id
    String orderId,           // razorpay_order_id
    String razorpaySignature, // razorpay_signature
    Long paymentRecordId      // optional, to link your payment table row
) {}
