package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.TransactionCategoryAssembler;
import com.abnerhs.rest_api_finances.config.JwtAuthenticationFilter;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryRequestDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.exception.handler.CustomEntityResponseHandler;
import com.abnerhs.rest_api_finances.service.TransactionCategoryService;
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

@WebMvcTest(TransactionCategoryController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CustomEntityResponseHandler.class)
class TransactionCategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private TransactionCategoryService service;

    @MockitoBean
    private TransactionCategoryAssembler assembler;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void shouldCreateTransactionCategory() throws Exception {
        TransactionCategoryDTO response = TestDataFactory.transactionCategoryResponse();
        TransactionCategoryRequestDTO request = TestDataFactory.transactionCategoryRequest();
        EntityModel<TransactionCategoryDTO> model = TestDataFactory.entityModel(response, "/api/transaction-categories/" + response.id());
        when(service.create(request)).thenReturn(response);
        when(assembler.toModel(response)).thenReturn(model);

        mockMvc.perform(post("/api/transaction-categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/transaction-categories/" + response.id()))
                .andExpect(jsonPath("$.id").value(response.id().toString()))
                .andExpect(jsonPath("$.name").value("Casa"));
    }

    @Test
    void shouldListTransactionCategories() throws Exception {
        TransactionCategoryDTO response = TestDataFactory.transactionCategoryResponse();
        when(service.findAll()).thenReturn(List.of(response));
        when(assembler.toCollectionModel(List.of(response))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(response, "/api/transaction-categories/" + response.id())),
                        "/api/transaction-categories"
                )
        );

        mockMvc.perform(get("/api/transaction-categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.transactionCategories[0].id").value(response.id().toString()))
                .andExpect(jsonPath("$._embedded.transactionCategories[0].name").value("Casa"));
    }

    @Test
    void shouldGetUpdatePatchAndDeleteCategory() throws Exception {
        TransactionCategoryDTO response = TestDataFactory.transactionCategoryResponse();
        TransactionCategoryRequestDTO request = new TransactionCategoryRequestDTO("Moradia");
        EntityModel<TransactionCategoryDTO> model = TestDataFactory.entityModel(response, "/api/transaction-categories/" + response.id());
        when(service.findById(response.id())).thenReturn(response);
        when(service.update(response.id(), request)).thenReturn(response);
        when(service.updatePartial(response.id(), Map.of("name", "Moradia"))).thenReturn(response);
        when(assembler.toModel(response)).thenReturn(model);
        doNothing().when(service).delete(response.id());

        mockMvc.perform(get("/api/transaction-categories/{id}", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(response.id().toString()));

        mockMvc.perform(put("/api/transaction-categories/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Casa"));

        mockMvc.perform(patch("/api/transaction-categories/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Moradia"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(response.id().toString()));

        mockMvc.perform(delete("/api/transaction-categories/{id}", response.id()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturnNotFoundWhenCategoryDoesNotExist() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.findById(id)).thenThrow(new ResourceNotFoundException("Categoria n\u00e3o encontrada"));

        mockMvc.perform(get("/api/transaction-categories/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Recurso n\u00e3o encontrado"));
    }
}
