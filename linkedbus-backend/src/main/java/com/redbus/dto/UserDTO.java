// UserDTO.java
package com.redbus.dto;

public record UserDTO(
    Long id,
    String name,
    String email,
    String phoneNumber,
    String gender,
    String city,
    String state
) {}
