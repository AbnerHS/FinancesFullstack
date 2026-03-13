package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.model.User;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private User user;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "accessSecretKey", "c3VwZXItc2VjcmV0LWFjY2Vzcy10b2tlbi1rZXktMzItYnl0ZXM=");
        ReflectionTestUtils.setField(jwtService, "refreshSecretKey", "c3VwZXItc2VjcmV0LXJlZnJlc2gtdG9rZW4ta2V5LTMyLWJ5dGVz");
        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", 60_000L);
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", 120_000L);

        user = new User("john@example.com", "encoded-password", "John");
    }

    @Test
    void shouldGenerateAndValidateAccessToken() {
        String token = jwtService.generateToken(user);

        assertEquals("john@example.com", jwtService.extractUsername(token));
        assertTrue(jwtService.isAccessTokenValid(token, user));
        assertThrows(JwtException.class, () -> jwtService.isRefreshTokenValid(token, user));
    }

    @Test
    void shouldGenerateAndValidateRefreshToken() {
        String token = jwtService.generateRefreshToken(user);

        assertEquals("john@example.com", jwtService.extractUsername(token));
        assertTrue(jwtService.isRefreshTokenValid(token, user));
        assertThrows(JwtException.class, () -> jwtService.isAccessTokenValid(token, user));
    }

    @Test
    void shouldKeepExtraClaimsWhenGeneratingToken() {
        String token = jwtService.generateToken(Map.of("scope", "full"), user);

        assertEquals("full", jwtService.extractClaim(token, claims -> claims.get("scope", String.class)));
    }

    @Test
    void shouldRejectInvalidToken() {
        assertThrows(JwtException.class, () -> jwtService.extractUsername("invalid-token"));
    }
}
