package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.dto.AuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.AuthenticationResponseDTO;
import com.abnerhs.rest_api_finances.dto.RegisterRequestDTO;
import com.abnerhs.rest_api_finances.service.AuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for authentication")
public class AuthenticationController {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";

    @Autowired
    private AuthenticationService service;

    @Value("${jwt.refresh.expiration-ms:604800000}")
    private long refreshTokenExpirationMs;

    @Value("${jwt.refresh.cookie.secure:false}")
    private boolean refreshCookieSecure;

    @Value("${jwt.refresh.cookie.same-site:Lax}")
    private String refreshCookieSameSite;

    @PostMapping("/register")
    @Operation(summary = "Register a new user", tags = {"Authentication"})
    public ResponseEntity<AuthenticationResponseDTO> register(
            @RequestBody RegisterRequestDTO request,
            HttpServletResponse response
    ) {
        var authResponse = service.register(request);
        addRefreshTokenCookie(response, authResponse.refreshToken());
        return ResponseEntity.ok(authResponse.withoutRefreshToken());
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate a user", tags = {"Authentication"})
    public ResponseEntity<AuthenticationResponseDTO> authenticate(
            @RequestBody AuthenticationRequestDTO request,
            HttpServletResponse response
    ) {
        var authResponse = service.authenticate(request);
        addRefreshTokenCookie(response, authResponse.refreshToken());
        return ResponseEntity.ok(authResponse.withoutRefreshToken());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", tags = {"Authentication"})
    public ResponseEntity<AuthenticationResponseDTO> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refreshToken = extractRefreshTokenFromCookie(request);
        var authResponse = service.refreshToken(refreshToken);
        addRefreshTokenCookie(response, authResponse.refreshToken());
        return ResponseEntity.ok(authResponse.withoutRefreshToken());
    }

    private void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .path("/api/auth")
                .sameSite(refreshCookieSameSite)
                .maxAge(refreshTokenExpirationMs / 1000)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }

        for (var cookie : request.getCookies()) {
            if (REFRESH_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }
}
