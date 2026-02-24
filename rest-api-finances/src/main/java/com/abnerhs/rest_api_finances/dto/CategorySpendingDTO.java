package com.abnerhs.rest_api_finances.dto;

import java.math.BigDecimal;

public record CategorySpendingDTO(
    String category,
    BigDecimal totalAmount
) {}