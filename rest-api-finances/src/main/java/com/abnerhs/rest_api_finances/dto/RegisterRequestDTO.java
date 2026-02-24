package com.abnerhs.rest_api_finances.dto;

public record RegisterRequestDTO(
    String name,
    String email,
    String password
) {}