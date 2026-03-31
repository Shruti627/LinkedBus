package com.redbus.admincontroller;

import com.redbus.admindto.BusResponse;
import com.redbus.admindto.CreateBusRequest;
import com.redbus.admindto.UpdateBusRequest;
import com.redbus.adminservice.AdminBusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin-api/buses")
@RequiredArgsConstructor
public class AdminBusController {

    private final AdminBusService adminBusService;

    @GetMapping
    public ResponseEntity<List<BusResponse>> listBuses() {
        return ResponseEntity.ok(adminBusService.listBuses());
    }

    @PostMapping
    public ResponseEntity<BusResponse> createBus(@RequestBody CreateBusRequest req) {
        BusResponse created = adminBusService.createBus(req);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BusResponse> updateBus(@PathVariable Long id, @RequestBody UpdateBusRequest req) {
        return ResponseEntity.ok(adminBusService.updateBus(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBus(@PathVariable Long id) {
        adminBusService.deleteBus(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/toggle-active")
    public ResponseEntity<BusResponse> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(adminBusService.toggleActive(id));
    }
}
