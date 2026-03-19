package com.abnerhs.rest_api_finances.dto;

import java.util.UUID;

public record FinancialPlanInvitationResponseDTO(
        UUID planId,
        String planName,
        UUID ownerId,
        String ownerName,
        String ownerEmail,
        boolean alreadyParticipant,
        boolean owner
) {
}
