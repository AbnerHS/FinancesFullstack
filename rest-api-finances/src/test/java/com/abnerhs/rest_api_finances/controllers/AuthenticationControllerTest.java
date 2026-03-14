package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.config.JwtAuthenticationFilter;
import com.abnerhs.rest_api_finances.dto.AuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.AuthenticationResponseDTO;
import com.abnerhs.rest_api_finances.dto.RegisterRequestDTO;
import com.abnerhs.rest_api_finances.exception.handler.CustomEntityResponseHandler;
import com.abnerhs.rest_api_finances.service.AuthenticationService;
import com.abnerhs.rest_api_finances.service.UserDetailsServiceImpl;
import com.abnerhs.rest_api_finances.support.TestDataFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthenticationController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CustomEntityResponseHandler.class)
class AuthenticationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthenticationService service;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @Test
    void shouldRegisterAndSetRefreshCookie() throws Exception {
        RegisterRequestDTO request = TestDataFactory.registerRequest();
        AuthenticationResponseDTO response = TestDataFactory.authenticationResponse();
        when(service.register(request)).thenReturn(response);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.user.email").value("john@example.com"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refresh_token=refresh-token")))
                .andExpect(cookie().httpOnly("refresh_token", true));
    }

    @Test
    void shouldAuthenticateAndReturnUnauthorizedWhenServiceRejectsCredentials() throws Exception {
        AuthenticationRequestDTO request = new AuthenticationRequestDTO("john@example.com", "wrong-secret");
        when(service.authenticate(request)).thenThrow(new BadCredentialsException("Credenciais invalidas"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("Credenciais inv\u00e1lidas"))
                .andExpect(jsonPath("$.detail").value("Credenciais invalidas"));
    }

    @Test
    void shouldAuthenticateAndSetRefreshCookie() throws Exception {
        AuthenticationRequestDTO request = TestDataFactory.authenticationRequest();
        when(service.authenticate(request)).thenReturn(TestDataFactory.authenticationResponse());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refresh_token=refresh-token")));
    }

    @Test
    void shouldRefreshTokenUsingCookie() throws Exception {
        AuthenticationResponseDTO response = new AuthenticationResponseDTO(
                "new-access-token",
                "new-refresh-token",
                TestDataFactory.userResponse()
        );
        when(service.refreshToken("stored-refresh-token")).thenReturn(response);

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("refresh_token", "stored-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refresh_token=new-refresh-token")));
    }

    @Test
    void shouldReturnUnauthorizedWhenRefreshCookieIsMissing() throws Exception {
        when(service.refreshToken(isNull())).thenThrow(new BadCredentialsException("Refresh token invalido"));

        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Refresh token invalido"));
    }

    @Test
    void shouldReturnUnauthorizedWhenRefreshCookieNameDoesNotMatch() throws Exception {
        when(service.refreshToken(isNull())).thenThrow(new BadCredentialsException("Refresh token invalido"));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie("other_cookie", "value")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Refresh token invalido"));
    }
}
