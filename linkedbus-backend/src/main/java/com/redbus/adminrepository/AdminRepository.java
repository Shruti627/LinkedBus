package com.redbus.adminrepository;

import com.redbus.adminmodel.Admin;
import com.redbus.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Long> {
    Optional<Admin> findByUser(User user);
    boolean existsByUser(User user);
    boolean existsByUserId(Long userId);
}
