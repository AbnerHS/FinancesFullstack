package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.AuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.AuthenticationResponseDTO;
import com.abnerhs.rest_api_finances.dto.RegisterRequestDTO;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository repository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthenticationService service;

    @Test
    void shouldRegisterUserAndReturnTokens() {
        RegisterRequestDTO request = new RegisterRequestDTO("John", "john@example.com", "secret123");
        when(passwordEncoder.encode(request.password())).thenReturn("encoded-password");
        when(jwtService.generateToken(any(User.class))).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any(User.class))).thenReturn("refresh-token");

        AuthenticationResponseDTO result = service.register(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(repository).save(captor.capture());
        User savedUser = captor.getValue();

        assertEquals(request.email(), savedUser.getEmail());
        assertEquals("encoded-password", savedUser.getPassword());
        assertEquals("access-token", result.accessToken());
        assertEquals("refresh-token", result.refreshToken());
        assertEquals(request.name(), result.user().name());
    }

    @Test
    void shouldAuthenticateExistingUser() {
        AuthenticationRequestDTO request = new AuthenticationRequestDTO("john@example.com", "secret123");
        User user = new User("john@example.com", "encoded-password", "John");

        when(repository.findByEmail(request.email())).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("access-token");
        when(jwtService.generateRefreshToken(user)).thenReturn("refresh-token");

        AuthenticationResponseDTO result = service.authenticate(request);

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        assertEquals("access-token", result.accessToken());
        assertEquals("refresh-token", result.refreshToken());
        assertEquals("John", result.user().name());
    }

    @Test
    void shouldThrowWhenAuthenticatedUserCannotBeLoaded() {
        AuthenticationRequestDTO request = new AuthenticationRequestDTO("john@example.com", "secret123");
        when(repository.findByEmail(request.email())).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> service.authenticate(request));
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void shouldRefreshTokenWhenTokenIsValid() {
        User user = new User("john@example.com", "encoded-password", "John");

        when(jwtService.extractUsername("refresh-token")).thenReturn("john@example.com");
        when(repository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(jwtService.isRefreshTokenValid("refresh-token", user)).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("new-access-token");
        when(jwtService.generateRefreshToken(user)).thenReturn("new-refresh-token");

        AuthenticationResponseDTO result = service.refreshToken("refresh-token");

        assertEquals("new-access-token", result.accessToken());
        assertEquals("new-refresh-token", result.refreshToken());
    }

    @Test
    void shouldRejectRefreshTokenWhenValidationFails() {
        User user = new User("john@example.com", "encoded-password", "John");

        when(jwtService.extractUsername("refresh-token")).thenReturn("john@example.com");
        when(repository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(jwtService.isRefreshTokenValid("refresh-token", user)).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> service.refreshToken("refresh-token"));
    }

    @Test
    void shouldRejectRefreshTokenWhenUsernameExtractionFails() {
        when(jwtService.extractUsername("refresh-token")).thenThrow(new IllegalArgumentException("invalid"));

        assertThrows(BadCredentialsException.class, () -> service.refreshToken("refresh-token"));
        verify(repository, never()).findByEmail(anyString());
    }
}
