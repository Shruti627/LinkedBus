package com.redbus.bootstrap;

import com.redbus.model.User;
import com.redbus.adminmodel.Admin;
import com.redbus.repository.UserRepository;
import com.redbus.adminrepository.AdminRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class CreateAdminRunner implements CommandLineRunner {

    @Value("${app.create-admin:false}")
    private boolean createAdmin;

    private final UserRepository userRepo;
    private final AdminRepository adminRepo;

    public CreateAdminRunner(UserRepository userRepo, AdminRepository adminRepo) {
        this.userRepo = userRepo;
        this.adminRepo = adminRepo;
    }

    @Override
    public void run(String... args) {
        if (!createAdmin) return;

        String email = "shrutisangvikar627@gmail.com";
        String password = "Shrutii@627";

        if (userRepo.findByEmail(email).isPresent()) {
            System.out.println("Admin user already exists. Skipping...");
            return;
        }

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        User user = new User();
        user.setName("Super Admin");
        user.setEmail(email);
        user.setPassword(encoder.encode(password));
        user.setPhoneNumber("9168086630");
        user.setGender("Female");
        user.setCity("N/A");
        user.setState("N/A");
//        user.setRole("ROLE_ADMIN");   // ⭐ DO NOT FORGET THIS

        User savedUser = userRepo.save(user);

        Admin admin = Admin.builder()
                .user(savedUser)
                .displayName("Super Admin")
                .phone("9168086630")
                .build();

        adminRepo.save(admin);

        System.out.println("🎉 ADMIN CREATED SUCCESSFULLY");
    }
}
