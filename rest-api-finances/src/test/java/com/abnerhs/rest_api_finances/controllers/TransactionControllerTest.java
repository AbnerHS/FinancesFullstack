package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.TransactionAssembler;
import com.abnerhs.rest_api_finances.config.JwtAuthenticationFilter;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.exception.handler.CustomEntityResponseHandler;
import com.abnerhs.rest_api_finances.service.TransactionService;
import com.abnerhs.rest_api_finances.service.UserDetailsServiceImpl;
import com.abnerhs.rest_api_finances.support.TestDataFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransactionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CustomEntityResponseHandler.class)
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private TransactionService service;

    @MockitoBean
    private TransactionAssembler assembler;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void shouldCreateTransaction() throws Exception {
        TransactionResponseDTO response = TestDataFactory.transactionResponse();
        EntityModel<TransactionResponseDTO> model = TestDataFactory.entityModel(response, "/api/transactions/" + response.id());
        when(service.create(TestDataFactory.transactionRequest())).thenReturn(response);
        when(assembler.toModel(response)).thenReturn(model);

        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.transactionRequest())))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/transactions/" + response.id()))
                .andExpect(jsonPath("$.id").value(response.id().toString()))
                .andExpect(jsonPath("$.category.name").value("Casa"));
    }

    @Test
    void shouldCreateRecurringTransactions() throws Exception {
        TransactionResponseDTO response = TestDataFactory.transactionResponse();
        when(service.createRecurring(TestDataFactory.recurringTransactionRequest())).thenReturn(List.of(response));
        when(assembler.toModel(response)).thenReturn(TestDataFactory.entityModel(response, "/api/transactions/" + response.id()));

        mockMvc.perform(post("/api/transactions/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.recurringTransactionRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(response.id().toString()));
    }

    @Test
    void shouldGetUpdatePatchAndDeleteTransaction() throws Exception {
        TransactionResponseDTO response = TestDataFactory.transactionResponse();
        EntityModel<TransactionResponseDTO> model = TestDataFactory.entityModel(response, "/api/transactions/" + response.id());
        when(service.findById(response.id())).thenReturn(response);
        when(service.update(response.id(), TestDataFactory.transactionRequest())).thenReturn(response);
        when(service.updatePartial(response.id(), Map.of("description", "Novo mercado"))).thenReturn(response);
        when(assembler.toModel(response)).thenReturn(model);
        doNothing().when(service).delete(response.id());

        mockMvc.perform(get("/api/transactions/{id}", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Supermercado"));

        mockMvc.perform(put("/api/transactions/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.transactionRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(response.id().toString()));

        mockMvc.perform(patch("/api/transactions/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("description", "Novo mercado"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category.name").value("Casa"));

        mockMvc.perform(delete("/api/transactions/{id}", response.id()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturnValidationAndNotFoundErrors() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.findById(id)).thenThrow(new ResourceNotFoundException("Transa\u00e7\u00e3o n\u00e3o encontrada"));

        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("description", "", "amount", 0, "type", "EXPENSE"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Erro de valida\u00e7\u00e3o"));

        mockMvc.perform(get("/api/transactions/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Transa\u00e7\u00e3o n\u00e3o encontrada"));
    }
}
