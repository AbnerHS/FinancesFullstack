package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.AuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.AuthenticationResponseDTO;
import com.abnerhs.rest_api_finances.dto.RegisterRequestDTO;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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

    public AuthenticationResponseDTO register(RegisterRequestDTO request) {
        var user = new User(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.name()
        );
        repository.save(user);
        var jwtToken = jwtService.generateToken(user);
        return new AuthenticationResponseDTO(jwtToken);
    }

    public AuthenticationResponseDTO authenticate(AuthenticationRequestDTO request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );
        var user = repository.findByEmail(request.email())
                .orElseThrow();
        var jwtToken = jwtService.generateToken(user);
        return new AuthenticationResponseDTO(jwtToken);
    }
}