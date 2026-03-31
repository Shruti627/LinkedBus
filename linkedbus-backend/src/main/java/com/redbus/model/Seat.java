package com.redbus.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String seatNumber; 
    private boolean booked;
    private double price;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bus_id")
    @JsonIgnore // <<< ADDED: prevent serializing the parent Bus here (breaks recursion)
    private Bus bus;

    // optional mapping (for bidirectional)
    @ManyToMany(mappedBy = "seats", fetch = FetchType.LAZY)
    @JsonIgnoreProperties("seats")
    private List<Booking> bookings;

}
