package com.abnerhs.rest_api_finances.dto;

public record AuthenticationResponseDTO(
    String token,
    String refreshToken,
    UserResponseDTO user
) {}
