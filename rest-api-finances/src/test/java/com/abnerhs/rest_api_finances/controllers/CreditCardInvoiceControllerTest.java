package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.CreditCardInvoiceAssembler;
import com.abnerhs.rest_api_finances.config.JwtAuthenticationFilter;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.exception.handler.CustomEntityResponseHandler;
import com.abnerhs.rest_api_finances.service.CreditCardInvoiceService;
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

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CreditCardInvoiceController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CustomEntityResponseHandler.class)
class CreditCardInvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private CreditCardInvoiceService service;

    @MockitoBean
    private CreditCardInvoiceAssembler assembler;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void shouldCreateGetUpdateAndDeleteInvoice() throws Exception {
        CreditCardInvoiceResponseDTO response = TestDataFactory.creditCardInvoiceResponse();
        EntityModel<CreditCardInvoiceResponseDTO> model = TestDataFactory.entityModel(response, "/api/credit-card-invoices/" + response.id());
        when(service.create(TestDataFactory.creditCardInvoiceRequest())).thenReturn(response);
        when(service.findById(response.id())).thenReturn(response);
        when(service.update(response.id(), TestDataFactory.creditCardInvoiceRequest())).thenReturn(response);
        when(assembler.toModel(response)).thenReturn(model);
        doNothing().when(service).delete(response.id());

        mockMvc.perform(post("/api/credit-card-invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.creditCardInvoiceRequest())))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/credit-card-invoices/" + response.id()));

        mockMvc.perform(get("/api/credit-card-invoices/{id}", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(500.00));

        mockMvc.perform(put("/api/credit-card-invoices/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.creditCardInvoiceRequest())))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/credit-card-invoices/{id}", response.id()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldReturnValidationErrorForInvalidInvoicePayload() throws Exception {
        CreditCardInvoiceRequestDTO invalidRequest = new CreditCardInvoiceRequestDTO(null, null, null);

        mockMvc.perform(post("/api/credit-card-invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Erro de valida\u00e7\u00e3o"));
    }
}
