package com.abnerhs.rest_api_finances.service;

public record GoogleUserProfile(
        String subject,
        String email,
        String name,
        boolean emailVerified
) {
}
