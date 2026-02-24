package com.abnerhs.rest_api_finances.dto;

import java.math.BigDecimal;

public record FinancialSummaryDTO(
    BigDecimal totalRevenue,
    BigDecimal totalExpense,
    BigDecimal balance
) {}