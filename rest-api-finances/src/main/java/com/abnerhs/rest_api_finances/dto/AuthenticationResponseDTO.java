package com.abnerhs.rest_api_finances.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

public record AuthenticationResponseDTO(
    String accessToken,
    @JsonIgnore
    String refreshToken,
    UserResponseDTO user
) {
    public AuthenticationResponseDTO withoutRefreshToken() {
        return new AuthenticationResponseDTO(accessToken, null, user);
    }
}
