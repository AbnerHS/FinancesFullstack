package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.dto.groups.onCreate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.groups.ConvertGroup;
import jakarta.validation.groups.Default;

public record RecurringTransactionRequestDTO(
        @Valid
        @ConvertGroup(from = Default.class, to = onCreate.class)
        @NotNull(message = "Os dados da transação são obrigatórios")
        TransactionRequestDTO transaction,

        @Min(value = 2, message = "O número de períodos deve ser pelo menos 2")
        int numberOfPeriods
) {}