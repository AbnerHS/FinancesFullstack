package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.AuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.AuthenticationResponseDTO;
import com.abnerhs.rest_api_finances.dto.GoogleAuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.RegisterRequestDTO;
import com.abnerhs.rest_api_finances.dto.UserResponseDTO;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.model.enums.AuthProvider;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

    @Autowired
    private UserRepository repository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private GoogleOAuthClient googleOAuthClient;

    public AuthenticationResponseDTO register(RegisterRequestDTO request) {
        var user = new User(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.name()
        );
        user.setAuthProvider(AuthProvider.LOCAL);
        repository.save(user);
        UserResponseDTO userDto = new UserResponseDTO(user.getId(), user.getName(), user.getEmail(), user.getAuthProvider());
        return buildAuthResponse(user, userDto);
    }

    public AuthenticationResponseDTO authenticate(AuthenticationRequestDTO request) {
        repository.findByEmail(request.email())
                .filter(User::usesGoogleAuthentication)
                .ifPresent(user -> {
                    throw new BadCredentialsException("Esta conta utiliza login exclusivo com Google");
                });

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );
        var user = repository.findByEmail(request.email())
                .orElseThrow();
        UserResponseDTO userDto = new UserResponseDTO(user.getId(), user.getName(), user.getEmail(), user.getAuthProvider());
        return buildAuthResponse(user, userDto);
    }

    public AuthenticationResponseDTO authenticateWithGoogle(GoogleAuthenticationRequestDTO request) {
        GoogleUserProfile profile = googleOAuthClient.authenticate(request.code());
        User user = repository.findByGoogleSubject(profile.subject())
                .map(existingBySubject -> resolveExistingGoogleUser(existingBySubject, profile))
                .orElseGet(() -> repository.findByEmail(profile.email())
                        .map(existingByEmail -> linkExistingUserToGoogle(existingByEmail, profile))
                        .orElseGet(() -> createGoogleUser(profile)));

        UserResponseDTO userDto = new UserResponseDTO(user.getId(), user.getName(), user.getEmail(), user.getAuthProvider());
        return buildAuthResponse(user, userDto);
    }

    public AuthenticationResponseDTO refreshToken(String refreshToken) {
        try {
            String userEmail = jwtService.extractUsername(refreshToken);
            User user = repository.findByEmail(userEmail).orElseThrow();

            if (!jwtService.isRefreshTokenValid(refreshToken, user)) {
                throw new BadCredentialsException("Refresh token invalido");
            }

            UserResponseDTO userDto = new UserResponseDTO(user.getId(), user.getName(), user.getEmail(), user.getAuthProvider());
            return buildAuthResponse(user, userDto);
        } catch (JwtException | IllegalArgumentException exception) {
            throw new BadCredentialsException("Refresh token invalido");
        }
    }

    private AuthenticationResponseDTO buildAuthResponse(UserDetails user, UserResponseDTO userDto) {
        var accessToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);
        return new AuthenticationResponseDTO(accessToken, refreshToken, userDto);
    }

    private User resolveExistingGoogleUser(User existingBySubject, GoogleUserProfile profile) {
        if (!existingBySubject.getEmail().equalsIgnoreCase(profile.email())) {
            throw new BadCredentialsException("Conta Google vinculada a outro usuario");
        }

        existingBySubject.setAuthProvider(AuthProvider.GOOGLE);
        existingBySubject.setGoogleSubject(profile.subject());
        existingBySubject.setEmailVerified(profile.emailVerified());
        if (existingBySubject.getName() == null || existingBySubject.getName().isBlank()) {
            existingBySubject.setName(profile.name());
        }
        return repository.save(existingBySubject);
    }

    private User linkExistingUserToGoogle(User existingByEmail, GoogleUserProfile profile) {
        if (existingByEmail.getGoogleSubject() != null
                && !existingByEmail.getGoogleSubject().equals(profile.subject())) {
            throw new BadCredentialsException("Conta Google vinculada a outro usuario");
        }

        existingByEmail.setAuthProvider(AuthProvider.GOOGLE);
        existingByEmail.setGoogleSubject(profile.subject());
        existingByEmail.setEmailVerified(profile.emailVerified());
        if (profile.name() != null && !profile.name().isBlank()) {
            existingByEmail.setName(profile.name());
        }

        return repository.save(existingByEmail);
    }

    private User createGoogleUser(GoogleUserProfile profile) {
        User user = new User(
                profile.email(),
                buildUnavailablePassword(),
                profile.name()
        );
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setGoogleSubject(profile.subject());
        user.setEmailVerified(profile.emailVerified());
        return repository.save(user);
    }

    private String buildUnavailablePassword() {
        return passwordEncoder.encode("GOOGLE_AUTH_ONLY::" + java.util.UUID.randomUUID());
    }
}
