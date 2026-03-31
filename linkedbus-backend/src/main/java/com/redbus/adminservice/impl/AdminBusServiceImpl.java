package com.redbus.adminservice.impl;

import com.redbus.admindto.BusResponse;
import com.redbus.admindto.CreateBusRequest;
import com.redbus.admindto.UpdateBusRequest;
import com.redbus.adminservice.AdminBusService;
import com.redbus.model.Bus;
import com.redbus.model.Seat;
import com.redbus.repository.BusRepository;
import com.redbus.repository.SeatRepository;
import com.redbus.service.BusService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminBusServiceImpl implements AdminBusService {

    private final BusService busService;
    private final BusRepository busRepository;
    private final SeatRepository seatRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE; // yyyy-MM-dd

    @Override
    public List<BusResponse> listBuses() {
        return busService.getAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BusResponse createBus(CreateBusRequest req) {
        Bus b = new Bus();
        b.setBusName(req.getBusName());
        b.setPrice(req.getPrice() != null ? req.getPrice() : 0.0);
        b.setBusType(req.getBusType());
        b.setSource(req.getSource());
        b.setDestination(req.getDestination());
        b.setDepartureTime(req.getDepartureTime());
        b.setArrivalTime(req.getArrivalTime());
        b.setStatus(req.getStatus() == null ? "active" : req.getStatus());

        // seats -> totalSeats
        if (req.getSeats() != null) {
            b.setTotalSeats(req.getSeats());
        }

        // parse & set departureDate if provided (expecting yyyy-MM-dd)
        if (req.getDepartureDate() != null && !req.getDepartureDate().isBlank()) {
            try {
                LocalDate dt = LocalDate.parse(req.getDepartureDate(), DATE_FMT);
                b.setDepartureDate(dt);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Invalid departureDate format, expected yyyy-MM-dd: " + req.getDepartureDate());
            }
        }

        // persist bus (this should return saved entity with id)
        Bus saved = busService.addBus(b);

        // generate seats if seats provided
        if (req.getSeats() != null && req.getSeats() > 0) {
            busService.generateSeatsForBus(saved.getId(), req.getSeats(), saved.getPrice());
        }

        return toResponse(saved);
    }

    @Override
    @Transactional
    public BusResponse updateBus(Long id, UpdateBusRequest req) {
        Bus existing = busService.getBusById(id);
        if (existing == null) throw new RuntimeException("Bus not found: " + id);

        if (req.getBusName() != null) existing.setBusName(req.getBusName());
        if (req.getBusType() != null) existing.setBusType(req.getBusType());
        if (req.getSource() != null) existing.setSource(req.getSource());
        if (req.getDestination() != null) existing.setDestination(req.getDestination());
        if (req.getDepartureTime() != null) existing.setDepartureTime(req.getDepartureTime());
        if (req.getArrivalTime() != null) existing.setArrivalTime(req.getArrivalTime());
        if (req.getPrice() != null) existing.setPrice(req.getPrice());
        if (req.getStatus() != null) existing.setStatus(req.getStatus());

        // seats -> totalSeats and regenerate seats if needed
        if (req.getSeats() != null) {
            int seats = req.getSeats();
            existing.setTotalSeats(seats);
            // regenerate seats: you may choose to adjust logic (remove/add) inside generateSeatsForBus
            busService.generateSeatsForBus(existing.getId(), seats, existing.getPrice());
        }

        // parse & set departureDate if provided
        if (req.getDepartureDate() != null && !req.getDepartureDate().isBlank()) {
            try {
                LocalDate dt = LocalDate.parse(req.getDepartureDate(), DATE_FMT);
                existing.setDepartureDate(dt);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Invalid departureDate format, expected yyyy-MM-dd: " + req.getDepartureDate());
            }
        }

        Bus saved = busRepository.save(existing);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteBus(Long id) {
        try {
            // fast delete seats by bus id if available
            seatRepository.deleteAllByBusId(id);
        } catch (Exception ex) {
            // fallback to explicit delete
            try {
                List<Seat> seats = seatRepository.findByBusId(id);
                if (seats != null && !seats.isEmpty()) {
                    seatRepository.deleteAll(seats);
                }
            } catch (Exception ignored) { /* ignore */ }
        }
        busRepository.deleteById(id);
    }

    @Override
    @Transactional
    public BusResponse toggleActive(Long id) {
        Bus b = busService.getBusById(id);
        if (b == null) throw new RuntimeException("Bus not found: " + id);
        String curr = b.getStatus();
        if (curr == null) curr = "inactive";
        b.setStatus("active".equalsIgnoreCase(curr) ? "inactive" : "active");
        Bus saved = busRepository.save(b);
        return toResponse(saved);
    }

    private BusResponse toResponse(Bus b) {
        BusResponse r = new BusResponse();
        r.setId(b.getId());
        r.setBusName(b.getBusName());

        // route: source → destination if available
        String route = null;
        if (b.getSource() != null && !b.getSource().isBlank() &&
            b.getDestination() != null && !b.getDestination().isBlank()) {
            route = b.getSource() + " → " + b.getDestination();
        }
        r.setRoute(route);

        // seats: prefer seatRepository count (accurate), fallback to totalSeats field
        int seatCount = 0;
        try {
            List<Seat> seats = seatRepository.findByBusId(b.getId());
            if (seats != null) seatCount = seats.size();
            if (seatCount == 0 && b.getTotalSeats() > 0) seatCount = b.getTotalSeats();
        } catch (Exception ignored) {
            seatCount = b.getTotalSeats();
        }
        r.setSeats(seatCount);

        r.setStatus(b.getStatus() == null ? "inactive" : b.getStatus());
        r.setPrice(b.getPrice());
        r.setBusType(b.getBusType());
        r.setSource(b.getSource());
        r.setDestination(b.getDestination());
        r.setDepartureTime(b.getDepartureTime());
        r.setArrivalTime(b.getArrivalTime());

        // include departureDate as String (yyyy-MM-dd) if present
        if (b.getDepartureDate() != null) {
            r.setDepartureDate(b.getDepartureDate().toString());
        } else {
            r.setDepartureDate(null);
        }

        // set total seats in response (expose totalSeats)
        r.setTotalSeats(b.getTotalSeats());

        return r;
    }

    @Override
    public long countBuses() {
        return busRepository.countAllBuses();
    }

    @Override
    public long countActiveBuses() {
        long count = busRepository.countActiveBuses();
        System.out.println("🚌 Active Buses Count (from DB): " + count);
        return count;
    }


}
