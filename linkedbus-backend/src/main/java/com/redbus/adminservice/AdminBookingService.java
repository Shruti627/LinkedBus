package com.redbus.adminservice;

import com.redbus.dto.RecentBookingDto;
import com.redbus.dto.BookingDTO;

import java.util.List;
import java.math.BigDecimal;

public interface AdminBookingService {
    List<RecentBookingDto> findRecentBookings(int limit);
    long countBookingsForToday();
    BigDecimal sumRevenueForToday();

    // Admin-specific operations
    BookingDTO getBookingByIdForAdmin(Long id);
    void updateBookingStatus(Long id, String status);
    boolean processRefund(Long id);
}
