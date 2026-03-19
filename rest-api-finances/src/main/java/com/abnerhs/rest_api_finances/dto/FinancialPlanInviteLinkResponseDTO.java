package com.abnerhs.rest_api_finances.dto;

import java.util.UUID;

public record FinancialPlanInviteLinkResponseDTO(
        UUID planId,
        String planName,
        String inviteToken,
        boolean active
) {
}
