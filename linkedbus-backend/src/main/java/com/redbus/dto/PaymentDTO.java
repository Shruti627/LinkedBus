package com.redbus.dto;

public record PaymentDTO(
    Long id,
    String orderId,
    String paymentId,
    String status,
    Double amount,
    String email,
    String paymentMethod   // new optional field - may be null
) {}
