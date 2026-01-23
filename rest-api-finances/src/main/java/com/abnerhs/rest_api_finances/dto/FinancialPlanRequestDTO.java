package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.dto.groups.onCreate;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record FinancialPlanRequestDTO(
        @NotBlank(message = "O nome do plano é obrigatório", groups = {onCreate.class, onUpdate.class})
        String name,

        @NotNull(message = "O ID do proprietario é obrigatório", groups = {onCreate.class})
        UUID ownerId,

        UUID partnerId
) {}

