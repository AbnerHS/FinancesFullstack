package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.config.JwtAuthenticationFilter;
import com.abnerhs.rest_api_finances.assembler.CreditCardAssembler;
import com.abnerhs.rest_api_finances.assembler.CreditCardInvoiceAssembler;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.exception.handler.CustomEntityResponseHandler;
import com.abnerhs.rest_api_finances.service.CreditCardInvoiceService;
import com.abnerhs.rest_api_finances.service.CreditCardService;
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

@WebMvcTest(CreditCardController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CustomEntityResponseHandler.class)
class CreditCardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private CreditCardService service;

    @MockitoBean
    private CreditCardAssembler assembler;

    @MockitoBean
    private CreditCardInvoiceService invoiceService;

    @MockitoBean
    private CreditCardInvoiceAssembler invoiceAssembler;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void shouldCreateGetUpdatePatchAndDeleteCreditCard() throws Exception {
        CreditCardResponseDTO response = TestDataFactory.creditCardResponse();
        EntityModel<CreditCardResponseDTO> model = TestDataFactory.entityModel(response, "/api/credit-cards/" + response.id());
        when(service.create(TestDataFactory.creditCardRequest())).thenReturn(response);
        when(service.findById(response.id())).thenReturn(response);
        when(service.update(response.id(), TestDataFactory.creditCardRequest())).thenReturn(response);
        when(service.updatePartial(response.id(), Map.of("name", "Master"))).thenReturn(response);
        when(assembler.toModel(response)).thenReturn(model);
        doNothing().when(service).delete(response.id());

        mockMvc.perform(post("/api/credit-cards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.creditCardRequest())))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/credit-cards/" + response.id()));

        mockMvc.perform(get("/api/credit-cards/{id}", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Visa"));

        mockMvc.perform(put("/api/credit-cards/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.creditCardRequest())))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/credit-cards/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Master"))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/credit-cards/{id}", response.id()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldListInvoicesByCreditCard() throws Exception {
        CreditCardResponseDTO creditCard = TestDataFactory.creditCardResponse();
        CreditCardInvoiceResponseDTO invoice = TestDataFactory.creditCardInvoiceResponse();
        when(invoiceService.findAllByCreditCard(creditCard.id())).thenReturn(List.of(invoice));
        when(invoiceAssembler.toCollectionModel(List.of(invoice))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(invoice, "/api/credit-card-invoices/" + invoice.id())),
                        "/api/credit-cards/" + creditCard.id() + "/invoices"
                )
        );

        mockMvc.perform(get("/api/credit-cards/{id}/invoices", creditCard.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.invoices[0].id").value(invoice.id().toString()));
    }

    @Test
    void shouldReturnNotFoundForMissingCreditCard() throws Exception {
        UUID id = UUID.randomUUID();
        when(service.findById(id)).thenThrow(new ResourceNotFoundException("Cart\u00e3o n\u00e3o encontrado"));

        mockMvc.perform(get("/api/credit-cards/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Cart\u00e3o n\u00e3o encontrado"));
    }
}
