package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.FinancialPeriodAssembler;
import com.abnerhs.rest_api_finances.assembler.FinancialPlanAssembler;
import com.abnerhs.rest_api_finances.config.JwtAuthenticationFilter;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.exception.handler.CustomEntityResponseHandler;
import com.abnerhs.rest_api_finances.service.FinancialPeriodService;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
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

@WebMvcTest(FinancialPlanController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CustomEntityResponseHandler.class)
class FinancialPlanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private FinancialPlanService service;

    @MockitoBean
    private FinancialPlanAssembler assembler;

    @MockitoBean
    private FinancialPeriodService financialPeriodService;

    @MockitoBean
    private FinancialPeriodAssembler financialPeriodAssembler;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void shouldCreateGetSummaryUpdatePatchAndDeletePlan() throws Exception {
        FinancialPlanResponseDTO response = TestDataFactory.financialPlanResponse();
        EntityModel<FinancialPlanResponseDTO> model = TestDataFactory.entityModel(response, "/api/plans/" + response.id());
        when(service.create(TestDataFactory.financialPlanRequest())).thenReturn(response);
        when(service.findById(response.id())).thenReturn(response);
        when(service.getSummary(response.id())).thenReturn(TestDataFactory.financialSummary());
        when(service.update(response.id(), TestDataFactory.financialPlanRequest())).thenReturn(response);
        when(service.updatePartial(response.id(), Map.of("name", "Plano Novo"))).thenReturn(response);
        when(assembler.toModel(response)).thenReturn(model);
        doNothing().when(service).delete(response.id());

        mockMvc.perform(post("/api/plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.financialPlanRequest())))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/plans/" + response.id()));

        mockMvc.perform(get("/api/plans/{id}", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Plano Casa"));

        mockMvc.perform(get("/api/plans/{id}/summary", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(900.00));

        mockMvc.perform(put("/api/plans/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.financialPlanRequest())))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/plans/{id}", response.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Plano Novo"))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/plans/{id}", response.id()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldListPeriodsByPlan() throws Exception {
        FinancialPlanResponseDTO plan = TestDataFactory.financialPlanResponse();
        FinancialPeriodResponseDTO period = TestDataFactory.financialPeriodResponse();
        when(financialPeriodService.findAllByPlan(plan.id())).thenReturn(List.of(period));
        when(financialPeriodAssembler.toCollectionModel(List.of(period))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(period, "/api/periods/" + period.id())),
                        "/api/plans/" + plan.id() + "/periods"
                )
        );

        mockMvc.perform(get("/api/plans/{id}/periods", plan.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.periods[0].id").value(period.id().toString()));
    }
}
