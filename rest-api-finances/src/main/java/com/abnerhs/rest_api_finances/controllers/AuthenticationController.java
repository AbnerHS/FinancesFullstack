package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.dto.AuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.AuthenticationResponseDTO;
import com.abnerhs.rest_api_finances.dto.RefreshTokenRequestDTO;
import com.abnerhs.rest_api_finances.dto.RegisterRequestDTO;
import com.abnerhs.rest_api_finances.service.AuthenticationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for authentication")
public class AuthenticationController {

    @Autowired
    private AuthenticationService service;

    @PostMapping("/register")
    @Operation(summary = "Register a new user", tags = {"Authentication"})
    public ResponseEntity<AuthenticationResponseDTO> register(
            @RequestBody RegisterRequestDTO request
    ) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate a user", tags = {"Authentication"})
    public ResponseEntity<AuthenticationResponseDTO> authenticate(
            @RequestBody AuthenticationRequestDTO request
    ) {
        return ResponseEntity.ok(service.authenticate(request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token", tags = {"Authentication"})
    public ResponseEntity<AuthenticationResponseDTO> refresh(
            @RequestBody RefreshTokenRequestDTO request
    ) {
        return ResponseEntity.ok(service.refreshToken(request));
    }
}
