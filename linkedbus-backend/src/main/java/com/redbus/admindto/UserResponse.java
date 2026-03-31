package com.redbus.admindto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;
    private String name;
    private String email;

    private String phone;   // new field for user's phone number
    private String city;    // new field for user's city or location
    private String reason; 
    private Boolean blocked; // whether user is blocked or not
    private List<String> roles; // roles or authorities (empty if not implemented)
}
