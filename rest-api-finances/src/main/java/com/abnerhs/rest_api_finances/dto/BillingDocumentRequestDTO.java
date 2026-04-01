package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.model.enums.BillingDocumentType;

public record BillingDocumentRequestDTO(
        BillingDocumentType type,
        String url
) {}
