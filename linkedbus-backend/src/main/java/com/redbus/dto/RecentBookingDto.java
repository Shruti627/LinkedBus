package com.redbus.dto;

import java.math.BigDecimal;
public record RecentBookingDto(
	    Long id,
	    String userName,
	    String userEmail,
	    String from,
	    String to,
	    BigDecimal amount,
	    String createdAt,
	    String status,
	    String seatNumbers // e.g. "A1, A2, A3"
	) {}
