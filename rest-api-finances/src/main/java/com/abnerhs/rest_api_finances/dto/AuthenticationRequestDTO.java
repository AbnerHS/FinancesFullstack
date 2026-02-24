package com.abnerhs.rest_api_finances.dto;

public record AuthenticationRequestDTO(
    String email,
    String password
) {}