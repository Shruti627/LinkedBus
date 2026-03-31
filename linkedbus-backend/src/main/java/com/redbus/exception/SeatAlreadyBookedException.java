package com.redbus.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

// This annotation tells Spring to automatically return an HTTP 409 Conflict
@ResponseStatus(HttpStatus.CONFLICT)
public class SeatAlreadyBookedException extends RuntimeException {
    
    // Constructor that accepts the error message
    public SeatAlreadyBookedException(String message) {
        super(message);
    }
}