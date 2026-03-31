package com.redbus.controller;

import com.redbus.dto.UserDTO;
import com.redbus.model.User;
import com.redbus.security.JwtUtil;
import com.redbus.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil, UserService userService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    /**
     * Step 1: Start registration -> send OTP to user's email.
     * Request body: full User JSON (name, email, password, phoneNumber, gender, city, state)
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerRequest(@RequestBody User user) {
        try {
            String msg = userService.sendOtpForRegistration(user);
            return ResponseEntity.ok(Map.of("message", msg));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Step 2: Verify OTP and create actual user. Also returns JWT token for convenience (auto-login).
     * Request body: { "email": "...", "otp": "123456" }
     */
    @PostMapping("/verify-register")
    public ResponseEntity<?> verifyRegister(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        String otp = req.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "email and otp are required"));
        }

        try {
            User created = userService.verifyOtpAndRegister(email, otp);

            // generate JWT so frontend can auto-login
            String token = jwtUtil.generateToken(created.getEmail());

            UserDTO dto = new UserDTO(created.getId(), created.getName(), created.getEmail(),
                    created.getPhoneNumber(), created.getGender(), created.getCity(), created.getState());

            return ResponseEntity.ok(Map.of(
                    "message", "Registration completed",
                    "token", token,
                    "user", dto
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Login (unchanged)
     * Request body: { "email": "...", "password": "..." }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));

            String token = jwtUtil.generateToken(email);
            User user = userService.findByEmail(email);

            UserDTO dto = new UserDTO(user.getId(), user.getName(), user.getEmail(),
                    user.getPhoneNumber(), user.getGender(), user.getCity(), user.getState());

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "user", dto
            ));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Server error"));
        }
    }

    /**
     * Password reset: request OTP
     * Request body: { "email": "..." }
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        try {
            userService.sendOtpForPasswordReset(email);
            return ResponseEntity.ok(Map.of("message", "OTP sent to your email."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Password reset: verify OTP + new password
     * Request body: { "email": "...", "otp": "...", "newPassword": "..." }
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "email, otp and newPassword are required"));
        }

        try {
            String message = userService.verifyOtpAndResetPassword(email, otp, newPassword);
            return ResponseEntity.ok(Map.of("message", message));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
