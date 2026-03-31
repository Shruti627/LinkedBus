package com.redbus.admincontroller;

import com.redbus.admindto.UserResponse;
import com.redbus.adminservice.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin-api/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> viewUsers() {
        return ResponseEntity.ok(adminUserService.viewUsers());
    }

    // NEW: single user GET - returns 200 or 404
    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long userId) {
        return adminUserService.findById(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{userId}/block")
    public ResponseEntity<Void> blockUser(@PathVariable Long userId,
                                          @RequestParam(required = false) String reason) {
        adminUserService.blockUser(userId, reason);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{userId}/unblock")
    public ResponseEntity<Void> unblockUser(@PathVariable Long userId) {
        adminUserService.unblockUser(userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}/bookings")
    public ResponseEntity<?> viewUserBookings(@PathVariable Long userId) {
        return ResponseEntity.ok(adminUserService.viewUserBookings(userId));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        adminUserService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }
}
