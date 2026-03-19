package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.dto.groups.onCreate;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import jakarta.validation.constraints.NotBlank;

public record FinancialPlanRequestDTO(
        @NotBlank(message = "O nome do plano é obrigatório", groups = {onCreate.class, onUpdate.class})
        String name
) {}
