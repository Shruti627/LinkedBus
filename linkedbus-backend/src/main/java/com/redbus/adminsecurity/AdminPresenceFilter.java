package com.redbus.adminsecurity;

import com.redbus.adminrepository.AdminRepository;
import com.redbus.model.User;
import com.redbus.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Ensures only users present in the admins table can access /admin-api/**
 * Works with default Spring Security UserDetails.
 */
public class AdminPresenceFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;

    public AdminPresenceFilter(UserRepository userRepository, AdminRepository adminRepository) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/admin-api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Not authenticated");
            return;
        }

        Object principal = authentication.getPrincipal();
        User user = resolveUser(principal, authentication.getName());
        if (user == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "User not found");
            return;
        }

        boolean isAdmin = adminRepository.existsByUser(user);
        if (!isAdmin) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Admin privileges required");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Resolve the logged-in User from authentication principal.
     */
    private User resolveUser(Object principal, String authName) {
        try {
            // Case 1: principal is a UserDetails implementation (most common)
            if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                String username = ud.getUsername();
                return userRepository.findByEmail(username).orElse(null);
            }

            // Case 2: principal is your User entity directly (some JWT setups do this)
            if (principal instanceof User u) {
                return userRepository.findById(u.getId()).orElse(null);
            }

            // Case 3: principal is a plain string (e.g. "anonymousUser") — treat authName as email
            if (principal instanceof String) {
                String name = (String) principal;
                if ("anonymousUser".equals(name)) return null;
                return userRepository.findByEmail(name).orElse(null);
            }

            // Fallback: try authName as email
            return userRepository.findByEmail(authName).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

}
