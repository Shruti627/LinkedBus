package com.redbus.mapper;

import com.redbus.dto.*;
import com.redbus.model.*;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Cleaner Entity <-> DTO mapper.
 *
 * Assumptions:
 * - DTOs use BigDecimal for money.
 * - Bus.departureTime & arrivalTime are Strings in entity; DTO uses LocalTime (optional parsing).
 * - Booking.totalFare is authoritative if present; otherwise computed from seat prices.
 */
public final class EntityMapper {

    private static final Logger LOG = Logger.getLogger(EntityMapper.class.getName());

    private EntityMapper() {}

    /* ============================
     * Helpers
     * ============================ */

    private static BigDecimal toBigDecimal(double primitive) {
        return BigDecimal.valueOf(primitive);
    }

    private static double safeDouble(BigDecimal bd, double fallback) {
        return bd != null ? bd.doubleValue() : fallback;
    }

    /* ============================
     * Entity -> DTO
     * ============================ */

    public static SeatDTO toSeatDTO(Seat seat, BigDecimal fallbackBusPrice) {
        if (seat == null) return null;
        BigDecimal seatPrice = (seat.getPrice() > 0) ? BigDecimal.valueOf(seat.getPrice()) : fallbackBusPrice;
        if (seatPrice == null) seatPrice = BigDecimal.ZERO;
        return new SeatDTO(
                seat.getId(),
                seat.getSeatNumber(),
                seat.isBooked(),
                seatPrice
        );
    }

    public static BusDTO toBusDTO(Bus bus, boolean includeSeats) {
        if (bus == null) return null;

        List<SeatDTO> seatDTOs = List.of();
        if (includeSeats && bus.getSeats() != null) {
            BigDecimal busPrice = toBigDecimal(bus.getPrice());
            seatDTOs = bus.getSeats().stream()
                    .filter(Objects::nonNull)
                    .map(s -> toSeatDTO(s, busPrice))
                    .collect(Collectors.toList());
        }

        // parse departure/arrival times if desired; otherwise keep as null or handle strings.
        LocalTime departureTime = null;
        LocalTime arrivalTime = null;
        try {
            if (bus.getDepartureTime() != null) departureTime = LocalTime.parse(bus.getDepartureTime());
        } catch (Exception e) {
            LOG.log(Level.FINE, "Unable to parse departureTime for bus id " + bus.getId(), e);
        }
        try {
            if (bus.getArrivalTime() != null) arrivalTime = LocalTime.parse(bus.getArrivalTime());
        } catch (Exception e) {
            LOG.log(Level.FINE, "Unable to parse arrivalTime for bus id " + bus.getId(), e);
        }

        BigDecimal busPrice = BigDecimal.valueOf(bus.getPrice());

        return new BusDTO(
                bus.getId(),
                bus.getBusName(),
                bus.getBusType(),
                bus.getSource(),
                bus.getDestination(),
                departureTime,                      // DTO expects LocalTime
                arrivalTime,
                bus.getDepartureDate(),             // LocalDate as in entity
                busPrice, // price as BigDecimal
                Collections.unmodifiableList(new ArrayList<>(seatDTOs))
        );
    }

    public static BusDTO toBusDTO(Bus bus) {
        return toBusDTO(bus, false);
    }

    public static BookingDTO toBookingDTO(Booking booking) {
        if (booking == null) return null;

        Bus bus = booking.getBus();
        BigDecimal busPrice = (bus != null) ? BigDecimal.valueOf(bus.getPrice()) : BigDecimal.ZERO;

        List<SeatDTO> bookedSeatDTOs = (booking.getSeats() != null)
                ? booking.getSeats().stream()
                    .filter(Objects::nonNull)
                    .map(s -> toSeatDTO(s, busPrice))
                    .collect(Collectors.toList())
                : List.of();

        // compute totalFare from seats as BigDecimal
        BigDecimal computedTotal = bookedSeatDTOs.stream()
                .map(SeatDTO::price)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Prefer Booking.totalFare if available on the entity (Booking.totalFare is BigDecimal in your model)
        BigDecimal bookingTotal = null;
        try {
            bookingTotal = booking.getTotalFare(); // booking.getTotalFare() returns BigDecimal now
        } catch (NoSuchMethodError | AbstractMethodError ignored) {
            // If entity doesn't have it, fall back to computedTotal
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Error reading booking total for booking id " + booking.getId(), e);
        }

        BigDecimal finalTotal = (bookingTotal != null) ? bookingTotal : computedTotal;

        BusDTO busDto = toBusDTO(bus, false);

        // --- map user to UserDTO (mapper can include user info) ---
        User user = booking.getUser();
        UserDTO userDTO = null;
        if (user != null) {
            userDTO = new UserDTO(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getPhoneNumber(),
                    user.getGender(),
                    user.getCity(),
                    user.getState()
            );
        }

        // Return BookingDTO including user; payment left null (service will enrich if needed)
        return new BookingDTO(
                booking.getId(),
                booking.getBookingTime(),
                booking.getStatus(),
                finalTotal,
                busDto,
                Collections.unmodifiableList(new ArrayList<>(bookedSeatDTOs)),
                userDTO,
                null
        );
    }


    public static List<BookingDTO> toBookingDTOList(List<Booking> bookings) {
        if (bookings == null) return List.of();
        return bookings.stream()
                .filter(Objects::nonNull)
                .map(EntityMapper::toBookingDTO)
                .collect(Collectors.toList());
    }

    /* ============================
     * DTO -> Entity
     * ============================ */

    public static Seat toSeatEntity(SeatDTO dto) {
        if (dto == null) return null;
        Seat seat = new Seat();
        seat.setId(dto.id());
        seat.setSeatNumber(dto.seatNumber());
        seat.setBooked(dto.booked());
        // convert BigDecimal -> double for entity (prefer changing entity to BigDecimal)
        if (dto.price() != null) seat.setPrice(dto.price().doubleValue());
        else seat.setPrice(0.0);
        return seat;
    }

    public static List<Seat> toSeatEntityList(List<SeatDTO> dtos) {
        if (dtos == null) return List.of();
        return dtos.stream()
                .filter(Objects::nonNull)
                .map(EntityMapper::toSeatEntity)
                .collect(Collectors.toList());
    }

    public static Bus toBusEntity(BusDTO dto) {
        if (dto == null) return null;
        Bus bus = new Bus();
        bus.setId(dto.id());
        bus.setBusName(dto.busName());
        bus.setBusType(dto.busType());
        bus.setSource(dto.source());
        bus.setDestination(dto.destination());
        // if DTO has LocalTime, convert to string for entity or change entity to LocalTime
        if (dto.departureTime() != null) bus.setDepartureTime(dto.departureTime().toString());
        if (dto.arrivalTime() != null) bus.setArrivalTime(dto.arrivalTime().toString());
        bus.setPrice(dto.price() != null ? dto.price().doubleValue() : 0.0);
        bus.setDepartureDate(dto.departureDate());
        return bus;
    }

    /* ============================
     * Convenience lists
     * ============================ */

    public static List<SeatDTO> toSeatDTOList(List<Seat> seats, BigDecimal busPrice) {
        if (seats == null) return List.of();
        return seats.stream().map(s -> toSeatDTO(s, busPrice)).collect(Collectors.toList());
    }

    public static List<BusDTO> toBusDTOList(List<Bus> buses, boolean includeSeats) {
        if (buses == null) return List.of();
        return buses.stream().map(b -> toBusDTO(b, includeSeats)).collect(Collectors.toList());
    }
}
