package com.abnerhs.rest_api_finances.dto;

import org.springframework.hateoas.server.core.Relation;

import java.math.BigDecimal;
import java.util.UUID;

@Relation(collectionRelation = "invoices", itemRelation = "invoice")
public record CreditCardInvoiceResponseDTO(
        UUID id,
        UUID creditCardId,
        String creditCardName,
        UUID periodId,
        BigDecimal amount
) {
}
