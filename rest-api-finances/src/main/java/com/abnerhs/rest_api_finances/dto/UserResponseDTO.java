package com.abnerhs.rest_api_finances.dto;

import org.springframework.hateoas.server.core.Relation;

import java.util.UUID;

@Relation(collectionRelation = "users", itemRelation = "user")
public record UserResponseDTO(
        UUID id,
        String name,
        String email
) {}