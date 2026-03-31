package com.redbus.repository;

import com.redbus.model.RegistrationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RegistrationTokenRepository extends JpaRepository<RegistrationToken, Long> {
    Optional<RegistrationToken> findByEmail(String email);
    void deleteByEmail(String email);
}
