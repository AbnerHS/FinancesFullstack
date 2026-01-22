package com.abnerhs.rest_api_finances.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record FinancialPlanRequestDTO(
        @NotBlank(message = "O nome do plano é obrigatório")
        String name,

        @NotNull(message = "O ID do proprietario é obrigatório")
        UUID ownerId,

        UUID partnerId
) {}

