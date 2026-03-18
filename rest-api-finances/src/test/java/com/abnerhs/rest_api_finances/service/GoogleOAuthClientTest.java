package com.abnerhs.rest_api_finances.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoogleOAuthClientTest {

    private static final String TOKEN_URI = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_URI = "https://openidconnect.googleapis.com/v1/userinfo";

    private MockRestServiceServer server;
    private GoogleOAuthClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new GoogleOAuthClient(
                builder,
                "client-id",
                "client-secret",
                "http://localhost:5173/auth/google/callback",
                TOKEN_URI,
                USERINFO_URI
        );
    }

    @Test
    void shouldAuthenticateWithGoogleCodeAndMapProfile() {
        server.expect(requestTo(TOKEN_URI))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Content-Type", org.hamcrest.Matchers.containsString(MediaType.APPLICATION_FORM_URLENCODED_VALUE)))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("code=valid-code")))
                .andRespond(withSuccess("{\"access_token\":\"google-access-token\"}", MediaType.APPLICATION_JSON));

        server.expect(requestTo(USERINFO_URI))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer google-access-token"))
                .andRespond(withSuccess("""
                        {
                          "sub": "google-subject",
                          "email": "john@example.com",
                          "name": "John",
                          "email_verified": true
                        }
                        """, MediaType.APPLICATION_JSON));

        GoogleUserProfile result = client.authenticate("valid-code");

        assertEquals("google-subject", result.subject());
        assertEquals("john@example.com", result.email());
        assertEquals("John", result.name());
    }

    @Test
    void shouldRejectInvalidGoogleCode() {
        server.expect(requestTo(TOKEN_URI))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withBadRequest());

        assertThrows(BadCredentialsException.class, () -> client.authenticate("invalid-code"));
    }

    @Test
    void shouldRejectUserInfoWithoutRequiredFields() {
        server.expect(requestTo(TOKEN_URI))
                .andRespond(withSuccess("{\"access_token\":\"google-access-token\"}", MediaType.APPLICATION_JSON));

        server.expect(requestTo(USERINFO_URI))
                .andRespond(withSuccess("""
                        {
                          "email": "",
                          "name": "John",
                          "email_verified": true
                        }
                        """, MediaType.APPLICATION_JSON));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> client.authenticate("valid-code"));

        assertEquals("Resposta do Google sem identificador do usuario", exception.getMessage());
    }

    @Test
    void shouldRejectGoogleProfileWithUnverifiedEmail() {
        server.expect(requestTo(TOKEN_URI))
                .andRespond(withSuccess("{\"access_token\":\"google-access-token\"}", MediaType.APPLICATION_JSON));

        server.expect(requestTo(USERINFO_URI))
                .andRespond(withSuccess("""
                        {
                          "sub": "google-subject",
                          "email": "john@example.com",
                          "name": "John",
                          "email_verified": false
                        }
                        """, MediaType.APPLICATION_JSON));

        BadCredentialsException exception = assertThrows(BadCredentialsException.class, () -> client.authenticate("valid-code"));

        assertEquals("Conta Google sem e-mail verificado", exception.getMessage());
    }
}
