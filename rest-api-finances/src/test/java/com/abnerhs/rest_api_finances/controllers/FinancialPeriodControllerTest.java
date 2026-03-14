package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.CreditCardInvoiceAssembler;
import com.abnerhs.rest_api_finances.config.JwtAuthenticationFilter;
import com.abnerhs.rest_api_finances.assembler.FinancialPeriodAssembler;
import com.abnerhs.rest_api_finances.assembler.TransactionAssembler;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.exception.handler.CustomEntityResponseHandler;
import com.abnerhs.rest_api_finances.service.CreditCardInvoiceService;
import com.abnerhs.rest_api_finances.service.FinancialPeriodService;
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

@WebMvcTest(FinancialPeriodController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CustomEntityResponseHandler.class)
class FinancialPeriodControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private FinancialPeriodService service;

    @MockitoBean
    private FinancialPeriodAssembler assembler;

    @MockitoBean
    private TransactionService transactionService;

    @MockitoBean
    private TransactionAssembler transactionAssembler;

    @MockitoBean
    private CreditCardInvoiceService invoiceService;

    @MockitoBean
    private CreditCardInvoiceAssembler invoiceAssembler;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void shouldCreateGetSummaryUpdatePatchAndDeletePeriod() throws Exception {
        FinancialPeriodResponseDTO response = TestDataFactory.financialPeriodResponse();
        EntityModel<FinancialPeriodResponseDTO> model = TestDataFactory.entityModel(response, "/api/periods/" + response.id());
        when(service.create(TestDataFactory.financialPeriodRequest())).thenReturn(response);
        when(service.findById(response.id())).thenReturn(response);
        when(service.getSummary(response.id())).thenReturn(TestDataFactory.financialSummary());
        when(service.update(response.id(), TestDataFactory.financialPeriodRequest())).thenReturn(response);
        when(service.updatePartial(response.id(), Map.of("month", 4))).thenReturn(response);
        when(assembler.toModel(response)).thenReturn(model);
        doNothing().when(service).delete(response.id());

        mockMvc.perform(post("/api/periods")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.financialPeriodRequest())))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/periods/" + response.id()));

        mockMvc.perform(get("/api/periods/{id}", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value(3));

        mockMvc.perform(get("/api/periods/{id}/summary", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(900.00));

        mockMvc.perform(put("/api/periods/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.financialPeriodRequest())))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/periods/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("month", 4))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/periods/{id}", response.id()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldListTransactionsAndInvoicesByPeriod() throws Exception {
        FinancialPeriodResponseDTO period = TestDataFactory.financialPeriodResponse();
        TransactionResponseDTO transaction = TestDataFactory.transactionResponse();
        CreditCardInvoiceResponseDTO invoice = TestDataFactory.creditCardInvoiceResponse();
        when(transactionService.findAllByPeriod(period.id())).thenReturn(List.of(transaction));
        when(transactionAssembler.toCollectionModel(List.of(transaction))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(transaction, "/api/transactions/" + transaction.id())),
                        "/api/periods/" + period.id() + "/transactions"
                )
        );
        when(invoiceService.findAllByPeriod(period.id())).thenReturn(List.of(invoice));
        when(invoiceAssembler.toCollectionModel(List.of(invoice))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(invoice, "/api/credit-card-invoices/" + invoice.id())),
                        "/api/periods/" + period.id() + "/invoices"
                )
        );

        mockMvc.perform(get("/api/periods/{id}/transactions", period.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.transactions[0].id").value(transaction.id().toString()));

        mockMvc.perform(get("/api/periods/{id}/invoices", period.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.invoices[0].id").value(invoice.id().toString()));
    }
}
