package com.abnerhs.rest_api_finances.dto;

import jakarta.validation.constraints.NotBlank;

public record TransactionCategoryRequestDTO(
        @NotBlank(message = "O nome da categoria é obrigatório")
        String name
) {}
