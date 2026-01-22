package com.abnerhs.rest_api_finances.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record FinancialPeriodRequestDTO(
        @NotNull(message = "O mês é obrigatório")
        @Min(1) @Max(12)
        Integer month,

        @NotNull(message = "O ano é obrigatório")
        Integer year,

        @NotNull(message = "O ID do plano financeiro é obrigatório")
        UUID financialPlanId
) {}