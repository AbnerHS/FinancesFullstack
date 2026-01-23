package com.abnerhs.rest_api_finances.dto;

import org.springframework.hateoas.RepresentationModel;

import java.util.UUID;

public class FinancialPlanResponseDTO extends RepresentationModel<FinancialPlanResponseDTO> {
    UUID id;
    String name;
    UUID ownerId;
    UUID partnerId;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public UUID getPartnerId() {
        return partnerId;
    }

    public void setPartnerId(UUID partnerId) {
        this.partnerId = partnerId;
    }
}
