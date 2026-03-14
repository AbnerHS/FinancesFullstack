package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.CreditCardAssembler;
import com.abnerhs.rest_api_finances.assembler.FinancialPlanAssembler;
import com.abnerhs.rest_api_finances.assembler.UserAssembler;
import com.abnerhs.rest_api_finances.config.JwtAuthenticationFilter;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.dto.UserResponseDTO;
import com.abnerhs.rest_api_finances.exception.handler.CustomEntityResponseHandler;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.service.CreditCardService;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
import com.abnerhs.rest_api_finances.service.UserService;
import com.abnerhs.rest_api_finances.service.UserDetailsServiceImpl;
import com.abnerhs.rest_api_finances.support.TestDataFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CustomEntityResponseHandler.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UserService service;

    @MockitoBean
    private UserAssembler assembler;

    @MockitoBean
    private FinancialPlanService financialPlanService;

    @MockitoBean
    private FinancialPlanAssembler financialPlanAssembler;

    @MockitoBean
    private CreditCardService creditCardService;

    @MockitoBean
    private CreditCardAssembler creditCardAssembler;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldCreateListAndGetUsers() throws Exception {
        UserResponseDTO response = TestDataFactory.userResponse();
        when(service.create(TestDataFactory.userRequest())).thenReturn(response);
        when(service.findAll()).thenReturn(List.of(response));
        when(service.findById(response.id())).thenReturn(response);
        when(assembler.toCollectionModel(List.of(response))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(response, "/api/users/" + response.id())),
                        "/api/users"
                )
        );
        when(assembler.toModel(response)).thenReturn(TestDataFactory.entityModel(response, "/api/users/" + response.id()));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.userRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("john@example.com"));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.users[0].id").value(response.id().toString()));

        mockMvc.perform(get("/api/users/{id}", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("John"));
    }

    @Test
    void shouldHandleCurrentUserEndpoints() throws Exception {
        User currentUser = TestDataFactory.currentUser();
        UserResponseDTO response = TestDataFactory.userResponse();
        FinancialPlanResponseDTO plan = TestDataFactory.financialPlanResponse();
        CreditCardResponseDTO card = TestDataFactory.creditCardResponse();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, currentUser.getPassword(), currentUser.getAuthorities())
        );

        when(service.findById(currentUser.getId())).thenReturn(response);
        when(service.update(currentUser.getId(), TestDataFactory.userUpdate())).thenReturn(response);
        doNothing().when(service).updatePassword(currentUser.getId(), TestDataFactory.userPasswordUpdate());
        when(assembler.toModel(response)).thenReturn(TestDataFactory.entityModel(response, "/api/users/" + response.id()));

        when(financialPlanService.findAllByUser(currentUser.getId())).thenReturn(List.of(plan));
        when(financialPlanAssembler.toCollectionModel(List.of(plan))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(plan, "/api/plans/" + plan.id())),
                        "/api/users/me/plans"
                )
        );

        when(creditCardService.findAllByUser(currentUser.getId())).thenReturn(List.of(card));
        when(creditCardAssembler.toCollectionModel(List.of(card))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(card, "/api/credit-cards/" + card.id())),
                        "/api/users/me/credit-cards"
                )
        );

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(response.id().toString()));

        mockMvc.perform(patch("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.userUpdate())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("john@example.com"));

        mockMvc.perform(put("/api/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TestDataFactory.userPasswordUpdate())))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/users/me/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.plans[0].id").value(plan.id().toString()));

        mockMvc.perform(get("/api/users/me/credit-cards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.creditCards[0].id").value(card.id().toString()));
    }

    @Test
    void shouldListPlansAndCreditCardsByUserId() throws Exception {
        UserResponseDTO response = TestDataFactory.userResponse();
        FinancialPlanResponseDTO plan = TestDataFactory.financialPlanResponse();
        CreditCardResponseDTO card = TestDataFactory.creditCardResponse();
        when(financialPlanService.findAllByUser(response.id())).thenReturn(List.of(plan));
        when(financialPlanAssembler.toCollectionModel(List.of(plan))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(plan, "/api/plans/" + plan.id())),
                        "/api/users/" + response.id() + "/plans"
                )
        );
        when(creditCardService.findAllByUser(response.id())).thenReturn(List.of(card));
        when(creditCardAssembler.toCollectionModel(List.of(card))).thenReturn(
                TestDataFactory.collectionModel(
                        List.of(TestDataFactory.entityModel(card, "/api/credit-cards/" + card.id())),
                        "/api/users/" + response.id() + "/credit-cards"
                )
        );

        mockMvc.perform(get("/api/users/{id}/plans", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.plans[0].id").value(plan.id().toString()));

        mockMvc.perform(get("/api/users/{id}/credit-cards", response.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._embedded.creditCards[0].id").value(card.id().toString()));
    }

    @Test
    void shouldReturnInternalServerErrorWhenCurrentUserIsMissing() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.title").value("Erro interno do servidor"));
    }

    @Test
    void shouldReturnInternalServerErrorWhenCurrentUserIsUnauthenticated() throws Exception {
        User currentUser = TestDataFactory.currentUser();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(currentUser, currentUser.getPassword())
        );

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.title").value("Erro interno do servidor"));
    }
}
