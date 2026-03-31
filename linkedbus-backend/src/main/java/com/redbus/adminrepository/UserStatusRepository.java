package com.redbus.adminrepository;

import com.redbus.adminmodel.UserStatus;
import com.redbus.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserStatusRepository extends JpaRepository<UserStatus, Long> {
    Optional<UserStatus> findByUser(User user);
    Optional<UserStatus> findByUserId(Long userId);
    boolean existsByUser(User user);
 // returns Optional<UserStatus> findByUser(User u) probably exists
    long countByBlockedTrue();

}
