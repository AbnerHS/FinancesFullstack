package com.abnerhs.rest_api_finances.dto;

import org.springframework.hateoas.server.core.Relation;

import java.util.UUID;

@Relation(collectionRelation = "creditCards", itemRelation = "creditCard")
public record CreditCardResponseDTO(
        UUID id,
        String name,
        UUID userId
) {
}
