package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.model.enums.BillingDocumentType;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public record BillingDocumentResponseDTO(
        BillingDocumentType type,
        String url,
        String fileName,
        String mimeType,
        String downloadUrl,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime uploadedAt
) {}
