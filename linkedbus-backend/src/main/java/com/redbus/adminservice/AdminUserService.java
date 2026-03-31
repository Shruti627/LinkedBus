package com.redbus.adminservice;

import com.redbus.admindto.UserResponse;
import com.redbus.dto.BookingDTO;

import java.util.List;
import java.util.Optional;

public interface AdminUserService {
    List<UserResponse> viewUsers();
    void blockUser(Long userId, String reason);
    void unblockUser(Long userId);
    List<BookingDTO> viewUserBookings(Long userId);
    void deleteUser(Long userId);

    // new:
    long countUsers();
    long countBlockedUsers();

    // added:
    Optional<UserResponse> findById(Long userId);
}
