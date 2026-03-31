package com.redbus.admindto;

import lombok.Data;

@Data
public class BusResponse {
    private Long id;
    private String busName;
    private String route;
    private Integer seats;
    private String status;
    private Double price;
    private String busType;
    private String source;
    private String destination;
    private String departureTime;
    private String arrivalTime;

    // ✅ Add these new fields:
    private String departureDate;  // formatted yyyy-MM-dd
    private Integer totalSeats;    // to expose bus.totalSeats from entity
}
