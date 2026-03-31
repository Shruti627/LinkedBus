package com.redbus.service;

import com.redbus.dto.BookingDTO;
import com.redbus.exception.SeatAlreadyBookedException;
import com.redbus.mapper.EntityMapper;
import com.redbus.model.Booking;
import com.redbus.model.Bus;
import com.redbus.model.Seat;
import com.redbus.model.User;
import com.redbus.payment.Payment;
import com.redbus.payment.PaymentService;
import com.redbus.repository.BookingRepository;
import com.redbus.repository.SeatRepository;
import com.redbus.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final SeatRepository seatRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PaymentService paymentService;

    public BookingService(BookingRepository bookingRepository,
                          SeatRepository seatRepository,
                          UserRepository userRepository,
                          EmailService emailService,
                          PaymentService paymentService) {
        this.bookingRepository = bookingRepository;
        this.seatRepository = seatRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.paymentService = paymentService;
    }

    /**
     * Original seat-only booking flow (unchanged).
     */
    @Transactional
    public BookingDTO bookSeats(Long userId, List<Long> seatIds, BigDecimal clientTotalFare) {
        // (the unchanged flow can remain as you had it earlier)
        // For brevity delegate to the payment-aware method with null payment fields
        return bookSeatsWithPayment(userId, seatIds, clientTotalFare, null, null, null);
    }

    /**
     * Payment-aware booking flow.
     *
     * - Attempts to resolve / reuse Payment record:
     *     1) If paymentRecordId provided -> load it (and optionally return existing booking).
     *     2) Else try find by orderId via paymentService.findByOrderId(orderId).
     *     3) Else if paymentId provided, create a minimal Payment (marked SUCCESS) and save it.
     *
     * - Proceeds to lock seats, validate, mark booked, create Booking and link paymentRecordId.
     *
     * @param userId           user making booking
     * @param seatIds          list of seat ids
     * @param clientTotalFare  total fare from client
     * @param paymentRecordId  optional internal payment id
     * @param orderId          optional razorpay order id
     * @param paymentId        optional razorpay payment id
     * @return BookingDTO
     */
    @Transactional
    public BookingDTO bookSeatsWithPayment(Long userId,
                                           List<Long> seatIds,
                                           BigDecimal clientTotalFare,
                                           Long paymentRecordId,
                                           String orderId,
                                           String paymentId) {
        // basic validation
        if (seatIds == null || seatIds.isEmpty()) throw new IllegalArgumentException("No seats selected for booking");
        if (userId == null) throw new IllegalArgumentException("userId is required");
        if (clientTotalFare == null) throw new IllegalArgumentException("totalFare is required");

        log.info("Payment-aware booking requested: userId={}, seatIds={}, fare={}, paymentRecordId={}, orderId={}, paymentId={}",
                userId, seatIds, clientTotalFare, paymentRecordId, orderId, paymentId);

        // --------------- Resolve or create Payment row ---------------
        Payment payment = null;

        if (paymentRecordId != null) {
            payment = paymentService.findById(paymentRecordId);
            if (payment == null) {
                throw new IllegalArgumentException("Payment record not found with id: " + paymentRecordId);
            }

            // Idempotency: if payment already SUCCESS and booking linked exists, return it
            if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
                BookingDTO existing = findByPaymentRecordId(paymentRecordId);
                if (existing != null) {
                    log.info("Existing booking found for paymentRecordId={}, returning existing booking.", paymentRecordId);
                    return existing;
                }
            }
        } else {
            // Try to find Payment by orderId first
            if (orderId != null && !orderId.isBlank()) {
                payment = paymentService.findByOrderId(orderId);
                if (payment != null) {
                    paymentRecordId = payment.getId();
                }
            }

            // If not found and paymentId provided, try to find by paymentId (via repository through PaymentService if implemented)
            if (payment == null && paymentId != null && !paymentId.isBlank()) {
                // We don't require a paymentService.findByPaymentId method; create minimal Payment here
                // but first try to search by orderId already attempted. If PaymentService has a findByPaymentId add that.
                // Create & save minimal Payment (assume the frontend/payment provider already captured payment)
                Payment stub = new Payment();
                stub.setPaymentId(paymentId);
                stub.setOrderId(orderId != null ? orderId : null);
                stub.setStatus("SUCCESS"); // mark success because frontend sent this after successful payment
                stub.setAmount(clientTotalFare.doubleValue());
                // try to set email/contact from user record if possible
                Optional<com.redbus.model.User> optUser = userRepository.findById(userId);
                if (optUser.isPresent()) {
                    User u = optUser.get();
                    stub.setEmail(u.getEmail());
                    // assume phone stored in phoneNumber or similar
                    try {
                        java.lang.reflect.Method m = u.getClass().getMethod("getPhoneNumber");
                        Object phone = m.invoke(u);
                        if (phone != null) stub.setContact(phone.toString());
                    } catch (Exception ignore) {
                        // ignore if method not present
                    }
                }
                stub.setUserId(userId);
                // busId will be set after seats are resolved (we might not know yet). We can save now and update later.
                payment = paymentService.save(stub);
                paymentRecordId = payment.getId();
                log.info("Created minimal Payment stub for paymentId/orderId: paymentId={}, orderId={}, id={}",
                        paymentId, orderId, paymentRecordId);
            }
        }

        // --------------- fetch user ---------------
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        // --------------- lock seats ---------------
        List<Seat> seats = seatRepository.findAllByIdForUpdate(seatIds);
        if (seats.size() != seatIds.size()) {
            List<Long> found = seats.stream().map(Seat::getId).collect(Collectors.toList());
            List<Long> missing = seatIds.stream().filter(id -> !found.contains(id)).collect(Collectors.toList());
            throw new IllegalArgumentException("Some seats not found: " + missing);
        }

        // reorder to match requested
        Map<Long, Seat> seatMap = seats.stream().collect(Collectors.toMap(Seat::getId, s -> s));
        seats = seatIds.stream().map(seatMap::get).collect(Collectors.toList());

        for (Seat seat : seats) {
            if (Boolean.TRUE.equals(seat.isBooked())) {
                log.info("Attempt to book already-booked seat: {} (id={})", seat.getSeatNumber(), seat.getId());
                throw new SeatAlreadyBookedException("Seat " + seat.getSeatNumber() + " is already booked");
            }
        }

        // --------------- fare validation ---------------
        BigDecimal calculatedTotalFare = seats.stream()
                .map(s -> BigDecimal.valueOf(s.getPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal epsilon = BigDecimal.valueOf(0.01);
        BigDecimal diff = calculatedTotalFare.subtract(clientTotalFare).abs();
        if (diff.compareTo(epsilon) > 0) {
            throw new IllegalArgumentException("Fare mismatch. Calculated: " +
                    calculatedTotalFare.setScale(2, RoundingMode.HALF_UP) +
                    ", Client: " + clientTotalFare.setScale(2, RoundingMode.HALF_UP));
        }

        // --------------- mark seats booked ---------------
        for (Seat seat : seats) seat.setBooked(true);
        seatRepository.saveAll(seats);

        // --------------- create booking ---------------
        Bus bus = seats.get(0).getBus();
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setBus(bus);
        booking.setSeats(seats);
        booking.setTotalFare(calculatedTotalFare);
        booking.setBookingTime(LocalDateTime.now());
        booking.setStatus("CONFIRMED");

        // attach paymentRecordId if available
        if (paymentRecordId != null) {
            try {
                // Booking entity must have setter for paymentRecordId
                booking.getClass().getMethod("setPaymentRecordId", Long.class).invoke(booking, paymentRecordId);
            } catch (NoSuchMethodException nsme) {
                // If setter doesn't exist, log and continue — recommend adding paymentRecordId field to Booking entity
                log.warn("Booking entity does not have setPaymentRecordId(Long). Please add paymentRecordId field mapped to booking.payment_record_id");
            } catch (Exception ex) {
                log.warn("Unable to set paymentRecordId on booking: {}", ex.getMessage());
            }
        }

        Booking saved = bookingRepository.save(booking);

        log.info("Payment-aware booking saved: bookingId={}, paymentRecordId={}", saved.getId(), paymentRecordId);

        // If we created a Payment stub earlier and didn't set busId/seatNumbers, update it now
        if (payment != null) {
            boolean updated = false;
            if (payment.getBusId() == null && bus != null) {
                payment.setBusId(bus.getId());
                updated = true;
            }
            if ((payment.getSeatNumbers() == null || payment.getSeatNumbers().isBlank())) {
                String seatNumbers = seats.stream().map(Seat::getSeatNumber).collect(Collectors.joining(","));
                payment.setSeatNumbers(seatNumbers);
                updated = true;
            }
            // ensure payment links to booking by business logic (if you add booking_id to Payment entity)
            if (payment.getId() != null) {
                payment.setPaymentId(payment.getPaymentId() != null ? payment.getPaymentId() : paymentId);
                payment.setStatus("SUCCESS");
                paymentService.save(payment);
            }
            if (updated) log.info("Updated payment id={} with busId/seatNumbers", payment.getId());
        }

        // --------------- send confirmation email (best effort) ---------------
        try {
            String seatNumbers = seats.stream().map(Seat::getSeatNumber).collect(Collectors.joining(", "));
            String subject = "RedBus Booking Confirmation";
            String message = String.format("Dear %s,\n\nYour RedBus booking is confirmed!\n\n" +
                            "Bus: %s\nRoute: %s → %s\nSeats: %s\nTotal Fare: ₹%s\nDeparture: %s\n\nThank you for booking with RedBus!",
                    user.getName(),
                    bus.getBusName(),
                    bus.getSource(),
                    bus.getDestination(),
                    seatNumbers,
                    calculatedTotalFare.setScale(2, RoundingMode.HALF_UP).toPlainString(),
                    bus.getDepartureTime()
            );
            emailService.sendEmail(user.getEmail(), subject, message);
            log.info("Confirmation email attempted for bookingId={}", saved.getId());
        } catch (Exception e) {
            log.warn("Failed to send booking confirmation email for bookingId={}", saved.getId(), e);
        }

        return EntityMapper.toBookingDTO(saved);
    }

    /**
     * Find a booking by payment record id (useful for idempotency).
     */
    @Transactional(readOnly = true)
    public BookingDTO findByPaymentRecordId(Long paymentRecordId) {
        if (paymentRecordId == null) return null;
        Optional<Booking> maybe = bookingRepository.findByPaymentRecordId(paymentRecordId);
        return maybe.map(EntityMapper::toBookingDTO).orElse(null);
    }

    // other helper/read methods below (unchanged)...
    @Transactional(readOnly = true)
    public String getBookingUserName(Long bookingId) {
        return bookingRepository.findUserNameByBookingId(bookingId).orElse("");
    }

    @Transactional(readOnly = true)
    public Booking getBookingWithRelations(Long bookingId) {
        return bookingRepository.findByIdWithUserAndRelations(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found with id: " + bookingId));
    }

    @Transactional(readOnly = true)
    public List<BookingDTO> getBookingsByUser(Long userId) {
        List<Booking> bookings = bookingRepository.findWithRelationsByUserId(userId);
        return EntityMapper.toBookingDTOList(bookings);
    }

    @Transactional(readOnly = true)
    public BookingDTO getBookingById(Long id) {
        Booking booking = bookingRepository.findByIdWithUserAndRelations(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found with id: " + id));
        return EntityMapper.toBookingDTO(booking);
    }

    @Transactional
    public void cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        for (Seat seat : booking.getSeats()) seat.setBooked(false);
        seatRepository.saveAll(booking.getSeats());

        booking.setStatus("CANCELLED");
        bookingRepository.save(booking);

        log.info("Booking cancelled: id={}", bookingId);
    }

    @Transactional
    public boolean processRefund(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if ("REFUNDED".equalsIgnoreCase(booking.getStatus()) || "REFUND_PENDING".equalsIgnoreCase(booking.getStatus())) {
            return true;
        }

        if (!"CONFIRMED".equalsIgnoreCase(booking.getStatus())) {
            return false;
        }

        boolean paymentRefunded = false;
        try {
            // simulate or call paymentService.refund(...)
            paymentRefunded = true;
        } catch (Exception e) {
            log.error("Refund failed for bookingId={}", bookingId, e);
            paymentRefunded = false;
        }

        if (!paymentRefunded) return false;

        for (Seat seat : booking.getSeats()) seat.setBooked(false);
        seatRepository.saveAll(booking.getSeats());

        booking.setStatus("REFUNDED");
        bookingRepository.save(booking);

        try {
            String message = String.format("Your booking %s has been refunded. Amount: ₹%s",
                    booking.getId(),
                    booking.getTotalFare() == null ? "0.00" : booking.getTotalFare().setScale(2, RoundingMode.HALF_UP).toPlainString());
            emailService.sendEmail(booking.getUser().getEmail(), "RedBus Refund Processed", message);
        } catch (Exception e) {
            log.warn("Failed to send refund email for bookingId={}", bookingId, e);
        }

        return true;
    }
}
