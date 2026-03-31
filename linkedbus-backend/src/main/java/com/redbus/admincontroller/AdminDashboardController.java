package com.redbus.admincontroller;

import com.redbus.adminservice.AdminBusService;
import com.redbus.adminservice.AdminUserService;
import com.redbus.adminservice.AdminBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Unified Admin Dashboard API
 * Returns all key summary stats for dashboard cards:
 *  - total users / blocked users
 *  - today's bookings / revenue
 *  - active buses
 */
@RestController
@RequestMapping("/api/admin-api")

@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminBusService adminBusService;
    private final AdminUserService adminUserService;
    private final AdminBookingService adminBookingService;

    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalUsers", adminUserService.countUsers());
        stats.put("totalBlocked", adminUserService.countBlockedUsers());
        stats.put("todaysBookings", adminBookingService.countBookingsForToday());
        stats.put("revenueToday", adminBookingService.sumRevenueForToday());
        stats.put("totalBuses", adminBusService.countBuses());
        stats.put("activeBuses", adminBusService.countActiveBuses());

        return ResponseEntity.ok(stats);
    }
}
