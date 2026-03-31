package com.redbus.service;

import com.redbus.dto.SeatDTO;
import com.redbus.mapper.EntityMapper;
import com.redbus.model.Bus;
import com.redbus.model.Seat;
import com.redbus.repository.BusRepository;
import com.redbus.repository.SeatRepository;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * SeatService
 *
 * - getSeatsByBus(Long)  => returns ALL seats (booked + available) as SeatDTO.
 * - getAvailableSeats(Long) => returns only not-booked seats as SeatDTO.
 *
 * This service relies on EntityMapper.toSeatDTO(seat, busPriceFallback).
 */
@Service
public class SeatService {

    private static final Logger log = LoggerFactory.getLogger(SeatService.class);

    private final SeatRepository seatRepository;
    private final BusRepository busRepository;

    public SeatService(SeatRepository seatRepository, BusRepository busRepository) {
        this.seatRepository = seatRepository;
        this.busRepository = busRepository;
    }

    /**
     * Return raw Seat entities for a bus (throws if bus missing).
     */
    public List<Seat> getSeatEntitiesByBus(Long busId) {
        if (busId == null) throw new IllegalArgumentException("busId is required");
        if (!busRepository.existsById(busId)) {
            throw new EntityNotFoundException("Bus not found with ID: " + busId);
        }
        List<Seat> seats = seatRepository.findByBusId(busId);
        return seats == null ? Collections.emptyList() : seats;
    }

    /**
     * Return SeatDTOs for ALL seats (booked + available).
     */
    public List<SeatDTO> getSeatsByBus(Long busId) {
        if (busId == null) throw new IllegalArgumentException("busId is required");

        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new EntityNotFoundException("Bus not found with ID: " + busId));

        BigDecimal busPriceFallback = BigDecimal.valueOf(bus.getPrice());

        List<Seat> seats = seatRepository.findByBusId(busId);
        if (seats == null || seats.isEmpty()) {
            return Collections.emptyList();
        }

        return seats.stream()
                .filter(Objects::nonNull)
                .map(seat -> EntityMapper.toSeatDTO(seat, busPriceFallback))
                .collect(Collectors.toList());
    }

    /**
     * Return SeatDTOs for available (not booked) seats for a bus.
     */
    public List<SeatDTO> getAvailableSeats(Long busId) {
        return getSeatsByBus(busId).stream()
                .filter(dto -> !dto.booked())
                .collect(Collectors.toList());
    }

    /**
     * Count available seats for a bus (fast and defensive).
     */
    public int countAvailableSeats(Long busId) {
        List<Seat> seats = getSeatEntitiesByBus(busId);
        if (seats == null || seats.isEmpty()) return 0;
        return (int) seats.stream().filter(seat -> !seat.isBooked()).count();
    }

    /**
     * Update single seat's booked status.
     */
    @Transactional
    public Seat updateSeatStatus(Long seatId, boolean booked) {
        if (seatId == null) throw new IllegalArgumentException("seatId is required");
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new EntityNotFoundException("Seat not found with ID: " + seatId));
        seat.setBooked(booked);
        Seat saved = seatRepository.save(seat);
        log.info("Seat {} (id={}) booked={} updated", saved.getSeatNumber(), saved.getId(), booked);
        return saved;
    }

    /**
     * Update multiple seats' status in one transaction.
     */
    @Transactional
    public void updateMultipleSeatStatus(List<Long> seatIds, boolean booked) {
        if (seatIds == null || seatIds.isEmpty()) throw new IllegalArgumentException("seatIds required");

        // If you have a findAllByIdForUpdate that locks rows, prefer it here for concurrency safety.
        List<Seat> seats = seatRepository.findAllById(seatIds);

        if (seats.size() != seatIds.size()) {
            List<Long> foundIds = seats.stream().map(Seat::getId).collect(Collectors.toList());
            List<Long> missing = seatIds.stream().filter(id -> !foundIds.contains(id)).collect(Collectors.toList());
            throw new EntityNotFoundException("Some seat IDs are invalid or missing: " + missing);
        }

        seats.forEach(s -> s.setBooked(booked));
        seatRepository.saveAll(seats);
        log.info("Updated {} seats to booked={} for ids={}", seats.size(), booked, seatIds);
    }

    /**
     * Reset all seats of a bus to not booked.
     */
    @Transactional
    public void resetAllSeats(Long busId) {
        List<Seat> seats = getSeatEntitiesByBus(busId);
        if (seats == null || seats.isEmpty()) {
            log.info("No seats to reset for busId={}", busId);
            return;
        }
        seats.forEach(seat -> seat.setBooked(false));
        seatRepository.saveAll(seats);
        log.info("Reset {} seats for busId={}", seats.size(), busId);
    }
}
