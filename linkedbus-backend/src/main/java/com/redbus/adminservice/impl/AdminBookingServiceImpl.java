package com.redbus.adminservice.impl;

import com.redbus.adminservice.AdminBookingService;
import com.redbus.dto.*;
import com.redbus.mapper.EntityMapper;
import com.redbus.model.Booking;
import com.redbus.payment.PaymentRepository;
import com.redbus.repository.BookingRepository;
import com.redbus.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminBookingServiceImpl implements AdminBookingService {

    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final PaymentRepository paymentRepository;

    private static final java.time.format.DateTimeFormatter TIME_FMT = java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final String UNKNOWN = "(unknown)";

    @Override
    public List<com.redbus.dto.RecentBookingDto> findRecentBookings(int limit) {
        var page = PageRequest.of(0, Math.max(1, limit));
        List<Booking> bookings = bookingRepository.findAllByOrderByBookingTimeDesc(page);
        return bookings.stream().map(this::toRecentDto).collect(Collectors.toList());
    }

    private com.redbus.dto.RecentBookingDto toRecentDto(Booking b) {
        String userName = (b.getUser() != null && b.getUser().getName() != null && !b.getUser().getName().isBlank())
                ? b.getUser().getName() : UNKNOWN;
        String userEmail = (b.getUser() != null && b.getUser().getEmail() != null && !b.getUser().getEmail().isBlank())
                ? b.getUser().getEmail() : UNKNOWN;
        String from = (b.getBus() != null && b.getBus().getSource() != null && !b.getBus().getSource().isBlank())
                ? b.getBus().getSource() : UNKNOWN;
        String to = (b.getBus() != null && b.getBus().getDestination() != null && !b.getBus().getDestination().isBlank())
                ? b.getBus().getDestination() : UNKNOWN;
        BigDecimal amount = b.getTotalFare() != null ? b.getTotalFare() : BigDecimal.ZERO;
        String createdAt = b.getBookingTime() != null ? b.getBookingTime().format(TIME_FMT) : null;
        String status = (b.getStatus() != null && !b.getStatus().isBlank()) ? b.getStatus() : UNKNOWN;
        String seatNumbers = (b.getSeats() != null && !b.getSeats().isEmpty())
                ? b.getSeats().stream()
                        .filter(java.util.Objects::nonNull)
                        .map(s -> {
                            var sn = s.getSeatNumber();
                            return (sn == null || sn.isBlank()) ? String.valueOf(s.getId()) : sn;
                        })
                        .collect(Collectors.joining(", "))
                : "";
        return new com.redbus.dto.RecentBookingDto(b.getId(), userName, userEmail, from, to, amount, createdAt, status, seatNumbers);
    }

    /**
     * Uses EntityMapper.toBookingDTO to map entity -> DTO, then enriches with PaymentDTO (if linked).
     */
    @Override
    @Transactional(readOnly = true)
    public BookingDTO getBookingByIdForAdmin(Long id) {
        Booking booking = bookingRepository.findByIdWithUserAndRelations(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        // Map core booking -> BookingDTO using shared mapper
        BookingDTO mapped = EntityMapper.toBookingDTO(booking);

        // If booking links to a payment record, fetch it and create PaymentDTO (with paymentMethod)
        PaymentDTO paymentDTO = null;
        Long payRecId = booking.getPaymentRecordId();
        if (payRecId != null) {
            Optional<com.redbus.payment.Payment> maybe = paymentRepository.findById(payRecId);
            if (maybe.isPresent()) {
                com.redbus.payment.Payment p = maybe.get();
                String inferredMethod = inferPaymentMethod(p);
                Double amountDouble = toDouble(p.getAmount()); // safe conversion
                paymentDTO = new PaymentDTO(
                        safeLong(p.getId()),
                        safeString(p.getOrderId()),
                        safeString(p.getPaymentId()),
                        safeString(p.getStatus()),
                        amountDouble,
                        safeString(p.getEmail()),
                        inferredMethod
                );
            }
        }

        // Enrich bus times and price if mapper returned nulls by falling back to entity values
        BusDTO enrichedBus = enrichBusDto(mapped != null ? mapped.bus() : null, booking);

        // If there is no payment field required and nothing to enrich, return the mapped DTO
        if (paymentDTO == null && enrichedBus == (mapped != null ? mapped.bus() : null)) {
            return mapped;
        }

        // BookingDTO is a record and immutable; create a new BookingDTO including payment and enriched bus
        return new BookingDTO(
                mapped.id(),
                mapped.bookingTime(),
                mapped.status(),
                mapped.totalFare(),
                enrichedBus,
                mapped.seats(),
                mapped.user(),
                paymentDTO
        );
    }

    /**
     * Enrich mapped BusDTO by preferring mapped values, and if mapped departure/arrival times are null,
     * fall back to the entity values from booking.getBus(). Also ensures price is BigDecimal and seats list typed.
     */
    private BusDTO enrichBusDto(BusDTO mappedBus, Booking booking) {
        if (booking == null) return mappedBus;

        // If mappedBus is null but the booking has a bus entity, build a DTO from the entity.
        if (mappedBus == null && booking.getBus() != null) {
            var b = booking.getBus();

            LocalTime dep = toLocalTime(b.getDepartureTime());
            LocalTime arr = toLocalTime(b.getArrivalTime());
            LocalDate depDate = toLocalDate(b.getDepartureDate());
            BigDecimal priceBd = toBigDecimal(b.getPrice());

            @SuppressWarnings("unchecked")
            List<SeatDTO> emptySeats = java.util.Collections.emptyList();

            return new BusDTO(
                    safeLong(b.getId()),
                    safeString(b.getBusName()),
                    safeString(b.getBusType()),
                    safeString(b.getSource()),
                    safeString(b.getDestination()),
                    dep,
                    arr,
                    depDate,
                    priceBd,
                    emptySeats
            );
        }

        if (mappedBus == null) return null;

        // If mapped bus exists, but times may be null; check booking entity bus for fallback values.
        LocalTime dep = mappedBus.departureTime();
        LocalTime arr = mappedBus.arrivalTime();
        if ((dep != null && arr != null) || booking.getBus() == null) {
            // ensure price is BigDecimal type and seats list present - mapped likely already correct
            return mappedBus;
        }

        // fallback values from entity (converted safely)
        LocalTime fallbackDep = toLocalTime(booking.getBus() != null ? booking.getBus().getDepartureTime() : null);
        LocalTime fallbackArr = toLocalTime(booking.getBus() != null ? booking.getBus().getArrivalTime() : null);

        LocalTime finalDep = dep != null ? dep : fallbackDep;
        LocalTime finalArr = arr != null ? arr : fallbackArr;

        // Ensure price remains BigDecimal
        BigDecimal priceBd = mappedBus.price();
        if (priceBd == null && booking.getBus() != null) {
            priceBd = toBigDecimal(booking.getBus().getPrice());
        }

        return new BusDTO(
                mappedBus.id(),
                mappedBus.busName(),
                mappedBus.busType(),
                mappedBus.source(),
                mappedBus.destination(),
                finalDep,
                finalArr,
                mappedBus.departureDate(),
                priceBd,
                mappedBus.seats()
        );
    }

    /**
     * Small heuristic to infer a payment method from the payment record.
     */
    private String inferPaymentMethod(com.redbus.payment.Payment p) {
        if (p == null) return null;
        try {
            // prefer explicit method/getter if present
            try {
                var m = p.getClass().getMethod("getMethod");
                Object v = m.invoke(p);
                if (v instanceof String && !((String) v).isBlank()) return (String) v;
            } catch (NoSuchMethodException ignored) {
            }

            Object payId = safeObject(p.getPaymentId());
            Object orderId = safeObject(p.getOrderId());
            if (payId instanceof String && ((String) payId).startsWith("pay_")) return "Razorpay";
            if (orderId instanceof String && ((String) orderId).startsWith("order_")) return "Razorpay";

            // add other gateway heuristics here if needed
        } catch (Exception e) {
            // ignore inference failures
        }
        return null;
    }

    // ---------------------- small helpers ----------------------

    private static Long safeLong(Object o) {
        if (o == null) return null;
        if (o instanceof Long) return (Long) o;
        if (o instanceof Number) return ((Number) o).longValue();
        try {
            return Long.valueOf(String.valueOf(o));
        } catch (Exception ex) {
            return null;
        }
    }

    private static String safeString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static Object safeObject(Object o) {
        return o;
    }

    private static Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Double) return (Double) o;
        if (o instanceof Number) return ((Number) o).doubleValue();
        try {
            return Double.valueOf(String.valueOf(o));
        } catch (Exception ex) {
            return null;
        }
    }

    private static BigDecimal toBigDecimal(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal) return (BigDecimal) o;
        if (o instanceof Number) {
            return BigDecimal.valueOf(((Number) o).doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(o));
        } catch (Exception ex) {
            return null;
        }
    }

    private static LocalDate toLocalDate(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate) return (LocalDate) o;
        if (o instanceof LocalDateTime) return ((LocalDateTime) o).toLocalDate();
        if (o instanceof String) {
            try {
                return LocalDate.parse((String) o);
            } catch (Exception ex) {
                return null;
            }
        }
        return null;
    }

    private static LocalTime toLocalTime(Object o) {
        if (o == null) return null;
        if (o instanceof LocalTime) return (LocalTime) o;
        if (o instanceof LocalDateTime) return ((LocalDateTime) o).toLocalTime();
        if (o instanceof String) {
            String s = (String) o;
            try {
                return LocalTime.parse(s);
            } catch (DateTimeParseException ex) {
                try {
                    return LocalTime.parse(s, java.time.format.DateTimeFormatter.ISO_LOCAL_TIME);
                } catch (Exception ex2) {
                    return null;
                }
            }
        }
        return null;
    }

    @Override
    @Transactional
    public void updateBookingStatus(Long id, String status) {
        if ("CANCELLED".equalsIgnoreCase(status) || "cancelled".equalsIgnoreCase(status)) {
            bookingService.cancelBooking(id);
            return;
        }
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        booking.setStatus(status);
        bookingRepository.save(booking);
    }

    @Override
    @Transactional
    public boolean processRefund(Long id) {
        return bookingService.processRefund(id);
    }

    @Override
    public long countBookingsForToday() {
        return bookingRepository.countByBookingTimeBetween(
                java.time.LocalDate.now().atStartOfDay(),
                java.time.LocalDate.now().atTime(java.time.LocalTime.MAX)
        );
    }

    @Override
    public BigDecimal sumRevenueForToday() {
        BigDecimal s = bookingRepository.sumTotalFareBetween(
                java.time.LocalDate.now().atStartOfDay(),
                java.time.LocalDate.now().atTime(java.time.LocalTime.MAX)
        );
        return s == null ? BigDecimal.ZERO : s;
    }
}
