package com.redbus.controller;

import com.redbus.dto.SeatDTO;
import com.redbus.service.SeatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * SeatController: exposes endpoints for seat maps.
 *
 * GET  /api/seats/bus/{busId}        -> returns ALL seats (booked + available)
 * GET  /api/seats/bus/{busId}/available -> returns only available seats (booked == false)
 */
@RestController
@RequestMapping("/api/seats")
@CrossOrigin(origins = "*")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) {
        this.seatService = seatService;
    }

    @GetMapping("/bus/{busId}")
    public ResponseEntity<List<SeatDTO>> getSeatsByBus(@PathVariable Long busId) {
        List<SeatDTO> seats = seatService.getSeatsByBus(busId);
        return ResponseEntity.ok(seats);
    }

    @GetMapping("/bus/{busId}/available")
    public ResponseEntity<List<SeatDTO>> getAvailableSeats(@PathVariable Long busId) {
        List<SeatDTO> availableSeats = seatService.getAvailableSeats(busId);
        return ResponseEntity.ok(availableSeats);
    }
}
