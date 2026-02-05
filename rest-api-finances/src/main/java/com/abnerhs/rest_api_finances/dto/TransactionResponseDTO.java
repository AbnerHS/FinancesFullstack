package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.hateoas.server.core.Relation;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Relation(collectionRelation = "transactions", itemRelation = "transaction")
public record TransactionResponseDTO(
        UUID id,
        String description,

        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "#,##0.00")
        BigDecimal amount,

        @JsonFormat(pattern = "dd/MM/yyyy")
        LocalDateTime dateTime,

        TransactionType type,
        String responsibilityTag,
        UUID periodId,
        UUID responsibleUserId,
        UUID recurringGroupId,
        UUID creditCardInvoiceId,
        boolean isClearedByInvoice
) {}
