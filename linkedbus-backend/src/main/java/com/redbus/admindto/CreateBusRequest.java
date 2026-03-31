// src/main/java/com/redbus/admindto/CreateBusRequest.java
package com.redbus.admindto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class CreateBusRequest {
    private String busName;
    private String route;

    // accept "seats" and "total_seats" from client
    @JsonAlias({ "seats", "total_seats" })
    private Integer seats; // seats used by DTO/service (total seats to generate)

    @JsonAlias("status")
    private String status;

    private Double price;
    private String busType;
    private String source;
    private String destination;
    private String departureTime;
    private String arrivalTime;

    // Accept both "departureDate" and "departure_date"
    @JsonAlias({ "departureDate", "departure_date" })
    private String departureDate; // keep String and parse in service
}
