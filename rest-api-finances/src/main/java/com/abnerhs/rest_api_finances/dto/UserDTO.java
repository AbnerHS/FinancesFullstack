package com.abnerhs.rest_api_finances.dto;

import java.util.UUID;

public record UserDTO(UUID id, String name, String email, String password) {
}
