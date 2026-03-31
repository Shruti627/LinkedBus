package com.redbus.dto;

import java.util.List;
import java.math.BigDecimal;

/**
 * Response per bus: basic bus info plus optional seat list.
 */
public record BusSearchResponse(
    BusSearchDto bus,
    List<SeatDTO> seats // may be empty or null if includeSeats=false
) {}
