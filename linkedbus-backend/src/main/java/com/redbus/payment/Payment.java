package com.redbus.payment;

import com.redbus.model.User;
import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "payment")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orderId;
    private String paymentId;
    private String status; // e.g. "SUCCESS", "FAILED", "PENDING"
    private Double amount;

    private String email;
    private String contact;

    // ✅ Explicitly map this to the same column name used by the relationship
    @Column(name = "user_id")
    private Long userId;

    private Long busId;

    private String seatNumbers;

    private LocalDateTime createdAt = LocalDateTime.now();

    // ✅ Link to User entity (read-only)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;
}
