package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.model.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionResponseDTO(
        UUID id,
        String description,
        BigDecimal amount,
        LocalDate date,
        TransactionType type,
        String responsibilityTag,
        UUID periodId,
        UUID responsibleUserId,
        UUID recurringGroupId
) {}
