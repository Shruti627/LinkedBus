// src/main/java/com/redbus/admindto/UpdateBusRequest.java
package com.redbus.admindto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class UpdateBusRequest {
    private String busName;
    private String route;

    // accept "seats" and "total_seats"
    @JsonAlias({ "seats", "total_seats" })
    private Integer seats; // if provided, will adjust seats

    private String status;
    private Double price;
    private String busType;
    private String source;
    private String destination;
    private String departureTime;
    private String arrivalTime;

    @JsonAlias({ "departureDate", "departure_date" })
    private String departureDate;
}
