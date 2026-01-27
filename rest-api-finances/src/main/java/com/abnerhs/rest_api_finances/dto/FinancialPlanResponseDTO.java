package com.abnerhs.rest_api_finances.dto;

import org.springframework.hateoas.server.core.Relation;

import java.util.UUID;

@Relation(collectionRelation = "plans", itemRelation = "plan")
public record FinancialPlanResponseDTO(
    UUID id,
    String name,
    UUID ownerId,
    UUID partnerId
){}
