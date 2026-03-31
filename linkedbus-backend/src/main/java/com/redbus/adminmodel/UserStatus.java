package com.redbus.adminmodel;

import com.redbus.model.User;
import lombok.*;

import jakarta.persistence.*;

@Entity
@Table(name = "user_status")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // link to existing User
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // admin-only status flags
    private boolean blocked;
    @Column(length = 500)
    private String reason;
}
