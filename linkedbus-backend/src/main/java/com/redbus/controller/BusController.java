package com.redbus.controller;

import com.redbus.model.Bus;
import com.redbus.service.BusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat; // <-- NEW IMPORT

import java.time.LocalDate; // <-- NEW IMPORT
import java.util.List;

@RestController
@RequestMapping("/api/bus")
// ❌ REMOVE THIS: The global CORS configuration in SecurityConfig is superior and fixes the error.
// @CrossOrigin(origins = "*") 
public class BusController {

    private final BusService busService;

    public BusController(BusService busService) {
        this.busService = busService;
    }

    // ... (getAll, getById, addBus methods remain the same) ...

    @GetMapping("/{id}")
    public ResponseEntity<Bus> getBusById(@PathVariable Long id) {
        Bus bus = busService.getBusById(id);
        if (bus == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(bus);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Bus>> findByRoute(
            @RequestParam String source,
            @RequestParam String destination,
            // 🚀 ADDED: The date parameter
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        // 🚀 UPDATED: Call the service method with the new date parameter
        return ResponseEntity.ok(busService.findByRoute(source, destination, date)); 
    }


    @PostMapping("/{busId}/generate-seats")
    public ResponseEntity<String> generateSeats(@PathVariable Long busId) {
        Bus bus = busService.getBusById(busId);

        if (bus == null) {
            return ResponseEntity.badRequest().body("❌ Bus not found for ID: " + busId);
        }

        double seatPrice = bus.getPrice();  // ✅ use bus’s own fare
        int totalSeats = bus.getTotalSeats();  // ✅ use existing seat count

        busService.generateSeatsForBus(busId, totalSeats, seatPrice);

        return ResponseEntity.ok("✅ " + totalSeats + " seats generated for " 
                                  + bus.getBusName() + " (₹" + seatPrice + " per seat)");
    }

}