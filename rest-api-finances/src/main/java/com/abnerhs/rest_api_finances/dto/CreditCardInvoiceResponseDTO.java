package com.abnerhs.rest_api_finances.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditCardInvoiceResponseDTO(
        UUID id,
        UUID creditCardId,
        UUID periodId,
        BigDecimal amount
) {
}
