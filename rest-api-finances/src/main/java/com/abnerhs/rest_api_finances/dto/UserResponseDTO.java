package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.model.enums.AuthProvider;
import org.springframework.hateoas.server.core.Relation;

import java.util.UUID;

@Relation(collectionRelation = "users", itemRelation = "user")
public record UserResponseDTO(
        UUID id,
        String name,
        String email,
        AuthProvider authProvider
) {}
