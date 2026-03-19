package com.abnerhs.rest_api_finances.dto;

import java.util.UUID;

public record FinancialPlanParticipantResponseDTO(
        UUID userId,
        String name,
        String email,
        String role
) {
}
