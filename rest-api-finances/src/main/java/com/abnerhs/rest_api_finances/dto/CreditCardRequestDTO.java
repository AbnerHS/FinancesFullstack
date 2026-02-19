package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.dto.groups.onCreate;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreditCardRequestDTO(
        @NotBlank(message = "O nome é obrigatório")
        String name,
        @NotNull(message = "O id do Usuário do cartão é obrigatório", groups = {onCreate.class, onUpdate.class})
        UUID userId
) {
}
