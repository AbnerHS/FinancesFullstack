package com.abnerhs.rest_api_finances.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserUpdateDTO(
        @NotBlank(message = "O nome é obrigatório")
        String name,

        @NotBlank(message = "O email é obrigatório")
        @Email(message = "Email inválido")
        String email
) {}