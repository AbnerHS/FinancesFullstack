package com.abnerhs.rest_api_finances.dto;

import org.springframework.hateoas.server.core.Relation;

import java.util.UUID;

@Relation(collectionRelation = "transactionCategories", itemRelation = "transactionCategory")
public record TransactionCategoryDTO(
        UUID id,
        String name
) {}
