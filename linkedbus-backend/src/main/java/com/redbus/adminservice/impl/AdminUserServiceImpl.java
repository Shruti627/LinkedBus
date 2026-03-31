package com.redbus.adminservice.impl;

import com.redbus.admindto.UserResponse;
import com.redbus.adminmodel.UserStatus;
import com.redbus.adminrepository.UserStatusRepository;
import com.redbus.adminservice.AdminUserService;
import com.redbus.dto.BookingDTO;
import com.redbus.model.User;
import com.redbus.repository.UserRepository;
import com.redbus.service.BookingService;
import com.redbus.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * AdminUserServiceImpl for Admin Panel User Management
 * Includes:
 *  - Block / Unblock with reason
 *  - Safe "soft delete" instead of hard delete (prevents foreign key constraint errors)
 *  - Phone and City in UserResponse
 */
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;
    private final UserStatusRepository userStatusRepository;
    private final BookingService bookingService;
    private final UserService userService;

    /**
     * List all users for admin panel (skips soft-deleted users)
     */
    @Override
    public List<UserResponse> viewUsers() {
        return userRepository.findAll().stream()
                .filter(u -> !"[Deleted User]".equals(u.getName())) // hide soft-deleted users
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Find by id -> returns Optional<UserResponse> so controllers can return 404
     */
    @Override
    public Optional<UserResponse> findById(Long userId) {
        return userRepository.findById(userId).map(this::toResponse);
    }

    /**
     * Block user with optional reason
     */
    @Override
    @Transactional
    public void blockUser(Long userId, String reason) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        UserStatus status = userStatusRepository.findByUser(u)
                .orElseGet(() -> UserStatus.builder().user(u).build());

        status.setBlocked(true);
        if (reason != null && !reason.isBlank()) {
            status.setReason(reason);
        }
        userStatusRepository.save(status);

        try {
            Method m = u.getClass().getMethod("setActive", Boolean.class);
            m.invoke(u, Boolean.FALSE);
            userRepository.save(u);
        } catch (NoSuchMethodException ignored) {
        } catch (Exception e) {
            // log if needed
            e.printStackTrace();
        }
    }

    /**
     * Unblock user
     */
    @Override
    @Transactional
    public void unblockUser(Long userId) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        userStatusRepository.findByUser(u).ifPresentOrElse(status -> {
            status.setBlocked(false);
            status.setReason(null);
            userStatusRepository.save(status);
        }, () -> {
            UserStatus s = UserStatus.builder().user(u).blocked(false).build();
            userStatusRepository.save(s);
        });

        try {
            Method m = u.getClass().getMethod("setActive", Boolean.class);
            m.invoke(u, Boolean.TRUE);
            userRepository.save(u);
        } catch (NoSuchMethodException ignored) {
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * View all bookings for a specific user
     */
    @Override
    public List<BookingDTO> viewUserBookings(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return bookingService.getBookingsByUser(userId);
    }

    /**
     * SAFE DELETE (Soft Delete)
     * Prevents foreign key constraint issues by not actually deleting the user record.
     */
    @Override
    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // 🔹 Soft delete: anonymize + deactivate
        user.setName("[Deleted User]");
        user.setEmail("deleted_" + userId + "@redbus.local");
        user.setPhoneNumber(null);
        user.setCity(null);

        // If user entity has 'active' field, mark false
        try {
            Method m = user.getClass().getMethod("setActive", Boolean.class);
            m.invoke(user, Boolean.FALSE);
        } catch (NoSuchMethodException ignored) {
        } catch (Exception e) {
            e.printStackTrace();
        }

        userRepository.save(user);

        // 🔹 Update UserStatus to show user is deleted
        var userStatus = userStatusRepository.findByUser(user).orElse(null);
        if (userStatus != null) {
            userStatus.setBlocked(true);
            userStatus.setReason("User deleted by admin");
            userStatusRepository.save(userStatus);
        } else {
            userStatusRepository.save(
                    UserStatus.builder()
                            .user(user)
                            .blocked(true)
                            .reason("User deleted by admin")
                            .build()
            );
        }
    }

    /**
     * Converts User entity to UserResponse DTO
     */
    private UserResponse toResponse(User u) {
        var userStatus = userStatusRepository.findByUser(u).orElse(null);
        Boolean blocked = (userStatus != null && userStatus.isBlocked());
        String reason = (userStatus != null && blocked) ? userStatus.getReason() : null;

        List<String> roles = List.of();
        String phone = u.getPhoneNumber() != null ? u.getPhoneNumber() : "-";
        String city = u.getCity() != null ? u.getCity() : "-";

        // keep builder pattern since your code used UserResponse.builder()
        return UserResponse.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .phone(phone)
                .city(city)
                .blocked(blocked)
                .reason(reason)
                .roles(roles)
                .build();
    }

    @Override
    public long countUsers() {
        return userRepository.count();
    }

    @Override
    public long countBlockedUsers() {
        try {
            return userStatusRepository.findAll().stream()
                    .filter(us -> us != null && Boolean.TRUE.equals(us.isBlocked()))
                    .count();
        } catch (Exception e) {
            return 0L;
        }
    }
}
