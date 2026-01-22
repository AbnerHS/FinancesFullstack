package com.abnerhs.rest_api_finances.dto;

import java.util.UUID;

public record FinancialPlanResponseDTO(
        UUID id,
        String name,
        UUID ownerId,
        String ownerName,
        UUID partnerId,
        String partnerName
) {
}
