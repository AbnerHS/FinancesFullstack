package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.dto.AuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.AuthenticationResponseDTO;
import com.abnerhs.rest_api_finances.dto.RegisterRequestDTO;
import com.abnerhs.rest_api_finances.dto.UserResponseDTO;
import com.abnerhs.rest_api_finances.service.AuthenticationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthenticationControllerIntegrationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthenticationService service;

    @Test
    void shouldRegisterAndSetRefreshCookie() throws Exception {
        RegisterRequestDTO request = new RegisterRequestDTO("John", "john@example.com", "secret123");
        AuthenticationResponseDTO response = new AuthenticationResponseDTO(
                "access-token",
                "refresh-token",
                new UserResponseDTO(UUID.randomUUID(), "John", "john@example.com")
        );

        when(service.register(request)).thenReturn(response);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.user.email").value("john@example.com"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("refresh_token=refresh-token")))
                .andExpect(cookie().httpOnly("refresh_token", true));
    }

    @Test
    void shouldAuthenticateAndReturnUnauthorizedWhenServiceRejectsCredentials() throws Exception {
        AuthenticationRequestDTO request = new AuthenticationRequestDTO("john@example.com", "wrong-secret");
        when(service.authenticate(request)).thenThrow(new org.springframework.security.authentication.BadCredentialsException("Credenciais invalidas"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("Credenciais inv\u00e1lidas"))
                .andExpect(jsonPath("$.detail").value("Credenciais invalidas"));
    }

    @Test
    void shouldRefreshTokenUsingCookie() throws Exception {
        AuthenticationResponseDTO response = new AuthenticationResponseDTO(
                "new-access-token",
                "new-refresh-token",
                new UserResponseDTO(UUID.randomUUID(), "John", "john@example.com")
        );

        when(service.refreshToken("stored-refresh-token")).thenReturn(response);

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", "stored-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("refresh_token=new-refresh-token")));
    }
}
