package com.abnerhs.rest_api_finances.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GoogleOAuthClient {

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String tokenUri;
    private final String userInfoUri;

    public GoogleOAuthClient(
            RestClient.Builder restClientBuilder,
            @Value("${google.oauth.client-id:}") String clientId,
            @Value("${google.oauth.client-secret:}") String clientSecret,
            @Value("${google.oauth.redirect-uri:}") String redirectUri,
            @Value("${google.oauth.token-uri:https://oauth2.googleapis.com/token}") String tokenUri,
            @Value("${google.oauth.userinfo-uri:https://openidconnect.googleapis.com/v1/userinfo}") String userInfoUri
    ) {
        this.restClient = restClientBuilder.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.tokenUri = tokenUri;
        this.userInfoUri = userInfoUri;
    }

    public GoogleUserProfile authenticate(String authorizationCode) {
        validateConfiguration();

        if (authorizationCode == null || authorizationCode.isBlank()) {
            throw new IllegalArgumentException("Codigo de autorizacao do Google e obrigatorio");
        }

        GoogleTokenResponse tokenResponse = exchangeCodeForTokens(authorizationCode);
        GoogleUserInfoResponse userInfoResponse = fetchUserInfo(tokenResponse.accessToken());

        validateUserInfo(userInfoResponse);

        return new GoogleUserProfile(
                userInfoResponse.subject(),
                userInfoResponse.email(),
                userInfoResponse.name(),
                Boolean.TRUE.equals(userInfoResponse.emailVerified())
        );
    }

    private GoogleTokenResponse exchangeCodeForTokens(String authorizationCode) {
        LinkedMultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code", authorizationCode);
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("redirect_uri", redirectUri);
        body.add("grant_type", "authorization_code");

        try {
            GoogleTokenResponse response = restClient.post()
                    .uri(tokenUri)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(GoogleTokenResponse.class);

            if (response == null || response.accessToken() == null || response.accessToken().isBlank()) {
                throw new IllegalArgumentException("Resposta invalida ao trocar codigo com Google");
            }

            return response;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().is4xxClientError()) {
                throw new BadCredentialsException("Credenciais do Google invalidas");
            }
            throw new IllegalStateException("Falha ao comunicar com Google", exception);
        } catch (RestClientException exception) {
            throw new IllegalStateException("Falha ao comunicar com Google", exception);
        }
    }

    private GoogleUserInfoResponse fetchUserInfo(String accessToken) {
        try {
            GoogleUserInfoResponse response = restClient.get()
                    .uri(userInfoUri)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .body(GoogleUserInfoResponse.class);

            if (response == null) {
                throw new IllegalArgumentException("Resposta invalida ao consultar usuario Google");
            }

            return response;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().is4xxClientError()) {
                throw new BadCredentialsException("Credenciais do Google invalidas");
            }
            throw new IllegalStateException("Falha ao comunicar com Google", exception);
        } catch (RestClientException exception) {
            throw new IllegalStateException("Falha ao comunicar com Google", exception);
        }
    }

    private void validateConfiguration() {
        if (clientId.isBlank() || clientSecret.isBlank() || redirectUri.isBlank()) {
            throw new IllegalArgumentException("Configuracao do Google OAuth2 esta incompleta");
        }
    }

    private void validateUserInfo(GoogleUserInfoResponse response) {
        if (response.subject() == null || response.subject().isBlank()) {
            throw new IllegalArgumentException("Resposta do Google sem identificador do usuario");
        }
        if (response.email() == null || response.email().isBlank()) {
            throw new IllegalArgumentException("Resposta do Google sem e-mail do usuario");
        }
        if (!Boolean.TRUE.equals(response.emailVerified())) {
            throw new BadCredentialsException("Conta Google sem e-mail verificado");
        }
    }

    record GoogleTokenResponse(@JsonProperty("access_token") String accessToken) {
    }

    record GoogleUserInfoResponse(
            String sub,
            String email,
            String name,
            @JsonProperty("email_verified") Boolean emailVerified
    ) {
        String subject() {
            return sub;
        }
    }
}
