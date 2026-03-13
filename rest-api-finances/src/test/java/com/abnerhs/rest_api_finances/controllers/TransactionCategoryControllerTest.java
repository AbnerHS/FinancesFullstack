package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryRequestDTO;
import com.abnerhs.rest_api_finances.service.TransactionCategoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class TransactionCategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private TransactionCategoryService service;

    @Test
    void shouldListTransactionCategories() throws Exception {
        when(service.findAll()).thenReturn(List.of(
                new TransactionCategoryDTO(UUID.randomUUID(), "Casa"),
                new TransactionCategoryDTO(UUID.randomUUID(), "Lazer")
        ));

        mockMvc.perform(get("/api/transaction-categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.transactionCategories[0].name").value("Casa"))
                .andExpect(jsonPath("$._embedded.transactionCategories[1].name").value("Lazer"));
    }

    @Test
    void shouldCreateTransactionCategory() throws Exception {
        UUID id = UUID.randomUUID();
        TransactionCategoryRequestDTO request = new TransactionCategoryRequestDTO("Casa");

        when(service.create(request)).thenReturn(new TransactionCategoryDTO(id, "Casa"));

        mockMvc.perform(post("/api/transaction-categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Casa"))
                .andExpect(jsonPath("$.id").value(id.toString()));
    }
}
