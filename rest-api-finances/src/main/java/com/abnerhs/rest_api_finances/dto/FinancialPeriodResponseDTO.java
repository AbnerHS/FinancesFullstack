package com.abnerhs.rest_api_finances.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record FinancialPeriodResponseDTO(
        UUID id,
        Integer month,
        Integer year,
        BigDecimal monthlyBalance,
        UUID financialPlanId
) {}