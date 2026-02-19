package com.abnerhs.rest_api_finances.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditCardInvoiceRequestDTO(
        @NotNull(message = "O id do cartão de crédito é obrigatório")
        UUID creditCardId,
        @NotNull(message = "O id do período é obrigatório")
        UUID periodId,
        @NotNull(message = "O valor da fatura é obrigatório")
        @Positive(message = "O valor da fatura deve ser positivo")
        BigDecimal amount
) {
}
