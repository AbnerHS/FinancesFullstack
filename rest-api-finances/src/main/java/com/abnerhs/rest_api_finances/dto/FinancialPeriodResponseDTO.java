package com.abnerhs.rest_api_finances.dto;

import org.springframework.hateoas.server.core.Relation;

import java.math.BigDecimal;
import java.util.UUID;

@Relation(collectionRelation = "periods", itemRelation = "period")
public record FinancialPeriodResponseDTO(
    UUID id,
    Integer month,
    Integer year,
    BigDecimal monthlyBalance,
    UUID financialPlanId
){}