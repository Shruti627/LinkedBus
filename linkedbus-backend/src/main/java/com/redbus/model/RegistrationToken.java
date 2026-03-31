package com.redbus.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "registration_token")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistrationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String email;
    private String name;
    private String password; 
    private String phoneNumber;
    private String gender;
    private String city;
    private String state;
    private String otp;
    private LocalDateTime expiryTime;
}
