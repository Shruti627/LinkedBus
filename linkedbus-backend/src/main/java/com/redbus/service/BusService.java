package com.redbus.service;

import com.redbus.model.Bus;
import com.redbus.model.Seat;
import com.redbus.repository.BusRepository;
import com.redbus.repository.SeatRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class BusService {

    private final BusRepository busRepository;
    private final SeatRepository seatRepository;

    public BusService(BusRepository busRepository, SeatRepository seatRepository) {
        this.busRepository = busRepository;
        this.seatRepository = seatRepository;
    }

    /**
     * Add a new bus and auto-generate seats for it.
     */
    @Transactional
    public Bus addBus(Bus bus) {
        Bus savedBus = busRepository.save(bus);

        // Auto-generate seats for the new bus if not already present
        if (savedBus.getSeats() == null || savedBus.getSeats().isEmpty()) {
            generateSeatsForBus(savedBus.getId(), savedBus.getTotalSeats(), savedBus.getPrice());
        }

        return savedBus;
    }

    /**
     * Fetch all buses.
     */
    public List<Bus> getAll() {
        return busRepository.findAll();
    }

    /**
     * Get a bus by ID.
     */
    public Bus getBusById(Long id) {
        return busRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("❌ Bus not found with ID: " + id));
    }

    /**
     * Search buses by route and date.
     */
    public List<Bus> findByRoute(String source, String destination, LocalDate date) {
        return busRepository.findByRouteWithDetails(source, destination, date);
    }

    /**
     * Generate or update seats for a bus.
     * Automatically uses the bus's own price from DB.
     */
    @Transactional
    public void generateSeatsForBus(Long busId, int totalSeats, double fallbackPrice) {
        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new RuntimeException("❌ Bus not found with ID: " + busId));

        // ✅ Use the bus’s actual price, fallback only if not set
        double seatPrice = bus.getPrice() > 0 ? bus.getPrice() : fallbackPrice;

        List<Seat> existingSeats = seatRepository.findByBusId(busId);
        int currentCount = existingSeats.size();

        // 🆕 Add missing seats if totalSeats increased
        if (totalSeats > currentCount) {
            List<Seat> newSeats = new ArrayList<>();
            for (int i = currentCount + 1; i <= totalSeats; i++) {
                Seat seat = new Seat();
                seat.setSeatNumber("S" + i);
                seat.setBooked(false);
                seat.setPrice(seatPrice);
                seat.setBus(bus);
                newSeats.add(seat);
            }
            seatRepository.saveAll(newSeats);
        }

        // 🧹 Remove extra seats only if not booked
        else if (totalSeats < currentCount) {
            long bookedCount = existingSeats.stream().filter(Seat::isBooked).count();
            if (totalSeats < bookedCount) {
                throw new RuntimeException("❌ Cannot reduce total seats below booked count!");
            }

            List<Seat> toRemove = existingSeats.subList(totalSeats, existingSeats.size());
            toRemove.removeIf(Seat::isBooked);
            seatRepository.deleteAll(toRemove);
        }

        // 🔄 Update total seats in bus table
        bus.setTotalSeats(totalSeats);
        busRepository.save(bus);
    }
}
