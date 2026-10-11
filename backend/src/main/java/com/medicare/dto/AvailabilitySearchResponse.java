package com.medicare.dto;
import java.util.List;
public record AvailabilitySearchResponse(List<AvailableSlotResponse> slots, String reason) {}
