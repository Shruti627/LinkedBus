package com.redbus.controller;

import com.redbus.dto.BookingDTO;
import com.redbus.dto.BookingRequestDTO;
import com.redbus.exception.SeatAlreadyBookedException;
import com.redbus.service.BookingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    private static final Logger log = LoggerFactory.getLogger(BookingController.class);
    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    // ✅ Handles normal and payment-based bookings
    @PostMapping("/book")
    public ResponseEntity<?> book(@RequestBody @Valid BookingRequestDTO req) {
        try {
            log.info("""
                ==== Booking request ====
                userId: {}
                busId: {}
                seatIds: {}
                totalFare: {}
                paymentId: {}
                orderId: {}
                paymentRecordId: {}
                """,
                    req.userId(),
                    req.busId(),
                    req.seatIds(),
                    req.totalFare(),
                    req.paymentId(),
                    req.orderId(),
                    req.paymentRecordId()
            );

            // ---- Basic Validation ----
            if (req.userId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId is required"));
            }
            if (req.busId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "busId is required"));
            }
            List<Long> seatIds = req.seatIds();
            if (seatIds == null || seatIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No seats selected"));
            }
            BigDecimal totalFare = req.totalFare();
            if (totalFare == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "totalFare is required"));
            }

            // ---- Choose which booking flow to use ----
            BookingDTO booking;

            if (req.paymentRecordId() != null) {
                log.info("🧾 Creating booking via PaymentRecordId={}", req.paymentRecordId());
                booking = bookingService.bookSeatsWithPayment(
                        req.userId(),
                        seatIds,
                        totalFare,
                        req.paymentRecordId(),
                        req.orderId(),
                        req.paymentId()
                );
            } else if (req.paymentId() != null || req.orderId() != null) {
                log.info("💳 Creating booking via Razorpay paymentId/orderId (no recordId)");
                booking = bookingService.bookSeatsWithPayment(
                        req.userId(),
                        seatIds,
                        totalFare,
                        null,
                        req.orderId(),
                        req.paymentId()
                );
            } else {
                log.info("🚌 Creating booking without payment linkage");
                booking = bookingService.bookSeats(req.userId(), seatIds, totalFare);
            }

            log.info("✅ Booking created successfully! BookingId={}, UserId={}, TotalFare={}",
                    booking.id(), req.userId(), totalFare);

            return ResponseEntity.ok(booking);

        } catch (SeatAlreadyBookedException e) {
            log.warn("⚠️ Seat already booked: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Seat already booked", "message", e.getMessage()));

        } catch (IllegalArgumentException e) {
            log.warn("⚠️ Invalid booking request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid data", "message", e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Booking failed due to unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server error", "message", e.getMessage()));
        }
    }

    // ✅ Fetch bookings by user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<BookingDTO>> getBookingsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(bookingService.getBookingsByUser(userId));
    }

    // ✅ Cancel a booking
    @DeleteMapping("/{bookingId}")
    public ResponseEntity<Map<String, String>> cancelBooking(@PathVariable Long bookingId) {
        bookingService.cancelBooking(bookingId);
        return ResponseEntity.ok(Map.of("message", "Booking cancelled successfully"));
    }
}
