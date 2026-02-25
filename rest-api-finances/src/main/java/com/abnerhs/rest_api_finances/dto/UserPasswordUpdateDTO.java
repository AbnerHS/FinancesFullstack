package com.abnerhs.rest_api_finances.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserPasswordUpdateDTO(
        @NotBlank(message = "A senha atual é obrigatória")
        String currentPassword,

        @NotBlank(message = "A nova senha é obrigatória")
        @Size(min = 6, message = "A nova senha deve ter no mínimo 6 caracteres")
        String newPassword
) {}