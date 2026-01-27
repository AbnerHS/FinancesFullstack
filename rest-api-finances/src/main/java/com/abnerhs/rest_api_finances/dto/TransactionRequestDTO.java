package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.dto.groups.onCreate;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record TransactionRequestDTO(
        @NotBlank(message = "A descrição é obrigatória", groups = {onCreate.class})
        String description,

        @NotNull(message = "O valor é obrigatório")
        @Positive(message = "O valor deve ser maior que zero")
        BigDecimal amount,

        @NotNull(message = "O tipo de transação (REVENUE/EXPENSE) é obrigatório")
        TransactionType type,

        @NotNull(message = "O ID do período é obrigatório")
        UUID periodId,

        @NotNull(message = "O ID do usuário responsável é obrigatório")
        UUID responsibleUserId,

        String responsibilityTag,

        UUID recurringGroupId
) {
}
