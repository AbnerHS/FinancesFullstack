package com.abnerhs.rest_api_finances.dto;

import com.abnerhs.rest_api_finances.model.enums.PaymentStatus;
import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TransactionDtoJsonTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

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
                  "isClearedByInvoice": false,
                  "dueDate": "2026-03-20",
                  "paymentDate": "2026-03-18",
                  "paymentStatus": "PAID",
                  "billingDocument": {
                    "type": "LINK",
                    "url": "https://exemplo.com/boleto.pdf"
                  }
                }
                """;

        TransactionRequestDTO dto = objectMapper.readValue(json, TransactionRequestDTO.class);

        assertEquals("Mercado", dto.description());
        assertEquals("CASA", dto.category().name());
        assertNull(dto.category().id());
        assertEquals(LocalDate.of(2026, 3, 20), dto.dueDate());
        assertEquals(LocalDate.of(2026, 3, 18), dto.paymentDate());
        assertEquals(PaymentStatus.PAID, dto.paymentStatus());
        assertEquals("https://exemplo.com/boleto.pdf", dto.billingDocument().url());
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
                false,
                LocalDate.of(2026, 3, 20),
                LocalDate.of(2026, 3, 18),
                PaymentStatus.PAID,
                null
        );

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(dto));

        assertTrue(json.has("category"));
        assertEquals("CASA", json.get("category").get("name").asText());
        assertFalse(json.has("responsibilityTag"));
        assertEquals("2026-03-20", json.get("dueDate").asText());
        assertEquals("2026-03-18", json.get("paymentDate").asText());
        assertEquals("PAID", json.get("paymentStatus").asText());
        assertTrue(json.has("billingDocument"));
        assertTrue(json.get("billingDocument").isNull());
    }
}
