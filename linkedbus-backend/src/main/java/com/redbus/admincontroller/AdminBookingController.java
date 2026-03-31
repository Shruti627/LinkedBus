package com.redbus.admincontroller;

import com.redbus.adminservice.AdminBookingService;
import com.redbus.dto.RecentBookingDto;
import com.redbus.dto.BookingDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin-api")

@RequiredArgsConstructor
public class AdminBookingController {

    private final AdminBookingService adminBookingService;

    @GetMapping("/bookings")
    public ResponseEntity<List<RecentBookingDto>> getRecentBookings(
            @RequestParam(required = false, defaultValue = "8") int limit) {
        List<RecentBookingDto> items = adminBookingService.findRecentBookings(limit);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/recent-bookings")
    public ResponseEntity<List<RecentBookingDto>> recentBookingsAlias(
            @RequestParam(required = false, defaultValue = "8") int limit) {
        return getRecentBookings(limit);
    }

    // --- New: view single booking details ---
    @GetMapping("/bookings/{id}")
    public ResponseEntity<BookingDTO> getBooking(@PathVariable Long id) {
        BookingDTO dto = adminBookingService.getBookingByIdForAdmin(id);
        return ResponseEntity.ok(dto);
    }

    // --- New: update booking status (cancel / confirm / etc.) ---
    @PutMapping("/bookings/{id}")
    public ResponseEntity<Void> updateBookingStatus(@PathVariable Long id,
                                                    @RequestBody StatusUpdateRequest req) {
        // req.status expected - simple DTO below
        adminBookingService.updateBookingStatus(id, req.status());
        return ResponseEntity.noContent().build();
    }

    // --- New: process refund (POST) ---
    @PostMapping("/bookings/{id}/refund")
    public ResponseEntity<RefundResponse> processRefund(@PathVariable Long id) {
        boolean ok = adminBookingService.processRefund(id);
        RefundResponse resp = new RefundResponse(ok ? "REFUNDED" : "FAILED");
        return ok ? ResponseEntity.ok(resp) : ResponseEntity.status(422).body(resp);
    }

    /* Small DTOs used by controller - move them to separate files if you prefer */
    public static record StatusUpdateRequest(String status) {}
    public static record RefundResponse(String result) {}
}
