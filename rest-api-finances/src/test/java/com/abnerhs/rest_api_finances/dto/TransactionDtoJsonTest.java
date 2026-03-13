package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TransactionDtoJsonTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldDeserializeRequestCategoryFromJson() throws Exception {
        String json = """
                {
                  "description": "Mercado",
                  "amount": 25.40,
                  "type": "EXPENSE",
                  "periodId": "e53f6d7d-31fb-47d1-9daf-1952093ff001",
                  "category": {
                    "id": null,
                    "name": "CASA"
                  },
                  "isClearedByInvoice": false
                }
                """;

        TransactionRequestDTO dto = objectMapper.readValue(json, TransactionRequestDTO.class);

        assertEquals("Mercado", dto.description());
        assertEquals("CASA", dto.category().name());
        assertNull(dto.category().id());
    }

    @Test
    void shouldSerializeResponseWithCategoryAndWithoutResponsibilityTag() throws Exception {
        TransactionResponseDTO dto = new TransactionResponseDTO(
                UUID.randomUUID(),
                "Mercado",
                new BigDecimal("25.40"),
                null,
                TransactionType.EXPENSE,
                new TransactionCategoryDTO(UUID.randomUUID(), "CASA"),
                UUID.randomUUID(),
                null,
                3,
                null,
                null,
                false
        );

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(dto));

        assertTrue(json.has("category"));
        assertEquals("CASA", json.get("category").get("name").asText());
        assertFalse(json.has("responsibilityTag"));
    }
}
