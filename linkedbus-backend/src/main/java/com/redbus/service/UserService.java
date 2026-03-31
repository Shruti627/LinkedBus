package com.redbus.service;

import com.redbus.adminrepository.AdminRepository;
import com.redbus.dto.UserDTO;
import com.redbus.model.PasswordResetToken;
import com.redbus.model.RegistrationToken;
import com.redbus.model.User;
import com.redbus.repository.PasswordResetTokenRepository;
import com.redbus.repository.RegistrationTokenRepository;
import com.redbus.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class UserService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final PasswordResetTokenRepository tokenRepository;
    private final RegistrationTokenRepository registrationTokenRepository;
    private final AdminRepository adminRepository; // <-- injected

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       PasswordResetTokenRepository tokenRepository,
                       RegistrationTokenRepository registrationTokenRepository,
                       AdminRepository adminRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.tokenRepository = tokenRepository;
        this.registrationTokenRepository = registrationTokenRepository;
        this.adminRepository = adminRepository;
    }

    // ---------------------------
    // Legacy register (immediate create) - kept if used elsewhere.
    // Prefer using registration OTP flow below for user sign-up.
    // ---------------------------
    public User register(User user) {

        user.setEmail(user.getEmail().trim().toLowerCase());

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User saved = userRepository.save(user);

        try {
            emailService.sendEmail(
                    saved.getEmail(),
                    "Welcome to RedBus!",
                    "Hi " + saved.getName() + ", your RedBus account has been created successfully!"
            );
        } catch (Exception e) {
            log.warn("Failed to send welcome email to {}: {}", saved.getEmail(), e.getMessage());
        }

        return saved;
    }

    // ---------------------------
    // Registration OTP flow
    // ---------------------------

    /**
     * Initiate registration: create a short-lived RegistrationToken and send OTP to user email.
     * This does NOT create User yet.
     */
    public String sendOtpForRegistration(User user) {

        // normalize email (CRITICAL FIX)
        String email = user.getEmail().trim().toLowerCase();
        user.setEmail(email);

        // block if user already exists
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("User already registered with this email.");
        }

        // block repeated OTP requests
        if (registrationTokenRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("OTP already sent. Please wait before requesting again.");
        }

        // generate secure 6-digit OTP
        SecureRandom secureRandom = new SecureRandom();
        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        RegistrationToken token = new RegistrationToken();
        token.setEmail(email);
        token.setName(user.getName());
        token.setPassword(user.getPassword()); // still TEMP
        token.setPhoneNumber(user.getPhoneNumber());
        token.setGender(user.getGender());
        token.setCity(user.getCity());
        token.setState(user.getState());
        token.setOtp(otp);
        token.setExpiryTime(expiry);

        registrationTokenRepository.save(token);

        String subject = "Your RedBus registration OTP";
        String body = "Hi " + (user.getName() == null ? "" : user.getName()) +
                ",\n\nYour OTP for completing registration is: " + otp +
                "\nThis code is valid for 10 minutes.\n\nIf you did not request this, ignore this email.";

        try {
            emailService.sendEmail(email, subject, body);
        } catch (Exception e) {
            registrationTokenRepository.delete(token);
            throw new RuntimeException("Failed to send OTP. Please try again.");
        }

        return "OTP sent to your email";
    }


    /**
     * Verify OTP and create actual User. Returns created User entity.
     */
   public User verifyOtpAndRegister(String email, String otp) {

    email = email.trim().toLowerCase();

    Optional<RegistrationToken> opt = registrationTokenRepository.findByEmail(email);
    if (opt.isEmpty()) {
        throw new RuntimeException("No registration found for this email. Please register first.");
    }

    RegistrationToken token = opt.get();

    if (token.getExpiryTime().isBefore(LocalDateTime.now())) {
        registrationTokenRepository.delete(token);
        throw new RuntimeException("OTP expired. Please register again.");
    }

    if (!token.getOtp().equals(otp)) {
        throw new RuntimeException("Invalid OTP.");
    }

    if (userRepository.findByEmail(email).isPresent()) {
        registrationTokenRepository.delete(token);
        throw new RuntimeException("Email already registered.");
    }

    User u = new User();
    u.setEmail(email);
    u.setName(token.getName());
    u.setPhoneNumber(token.getPhoneNumber());
    u.setGender(token.getGender());
    u.setCity(token.getCity());
    u.setState(token.getState());
    u.setPassword(passwordEncoder.encode(token.getPassword()));

    User saved = userRepository.save(u);

    registrationTokenRepository.delete(token);

    try {
        emailService.sendEmail(saved.getEmail(), "Welcome to RedBus!",
                "Hi " + saved.getName() + ", your account is ready.");
    } catch (Exception e) {
        log.warn("Failed to send welcome email to {}: {}", saved.getEmail(), e.getMessage());
    }

    return saved;
}


    // ---------------------------
    // Password reset (existing)
    // ---------------------------

    public void sendOtpForPasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        String otp = String.format("%06d", new Random().nextInt(1_000_000)); // 6-digit OTP
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        tokenRepository.findByEmail(email).ifPresent(tokenRepository::delete);

        PasswordResetToken token = new PasswordResetToken(email, otp, expiry);
        tokenRepository.save(token);

        try {
            emailService.sendEmail(
                    email,
                    "RedBus Password Reset OTP",
                    "Your OTP for password reset is: " + otp + "\nThis code is valid for 10 minutes."
            );
        } catch (Exception e) {
            log.warn("Failed to send password reset OTP to {}: {}", email, e.getMessage());
        }
    }

    public String verifyOtpAndResetPassword(String email, String otp, String newPassword) {
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByEmail(email);
        if (tokenOpt.isEmpty()) {
            throw new RuntimeException("No OTP found for this email. Please request again.");
        }

        PasswordResetToken token = tokenOpt.get();

        if (!token.getOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP.");
        }

        if (token.getExpiryTime().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(token);
            throw new RuntimeException("OTP expired. Please request a new one.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.delete(token);

        return "Password reset successful!";
    }

    // ---------------------------
    // UserDetailsService implementation
    // ---------------------------
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        // Grant ROLE_ADMIN if user exists in admin table
        boolean isAdmin = adminRepository.existsByUser(user);
        if (isAdmin) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        // add other roles/authorities here if needed

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + id));
        return new UserDTO(user.getId(), user.getName(), user.getEmail(),
                user.getPhoneNumber(), user.getGender(), user.getCity(), user.getState());
    }

    public UserDTO updateUser(Long id, User updated) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + id));
        if (updated.getName() != null) user.setName(updated.getName());
        if (updated.getPhoneNumber() != null) user.setPhoneNumber(updated.getPhoneNumber());
        if (updated.getGender() != null) user.setGender(updated.getGender());
        if (updated.getCity() != null) user.setCity(updated.getCity());
        if (updated.getState() != null) user.setState(updated.getState());
        userRepository.save(user);
        return new UserDTO(user.getId(), user.getName(), user.getEmail(),
                user.getPhoneNumber(), user.getGender(), user.getCity(), user.getState());
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}