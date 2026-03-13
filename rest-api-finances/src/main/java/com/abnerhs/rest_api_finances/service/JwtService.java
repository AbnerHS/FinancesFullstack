package com.abnerhs.rest_api_finances.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final String TOKEN_TYPE_CLAIM = "token_type";
    private static final String ACCESS_TOKEN_TYPE = "access";
    private static final String REFRESH_TOKEN_TYPE = "refresh";

    @Value("${jwt.access.secret}")
    private String accessSecretKey;

    @Value("${jwt.access.expiration-ms:900000}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh.secret}")
    private String refreshSecretKey;

    @Value("${jwt.refresh.expiration-ms:604800000}")
    private long refreshTokenExpiration;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, accessTokenExpiration, ACCESS_TOKEN_TYPE, getAccessSignInKey());
    }

    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(new HashMap<>(), userDetails, refreshTokenExpiration, REFRESH_TOKEN_TYPE, getRefreshSignInKey());
    }

    private String buildToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails,
            long expiration,
            String tokenType,
            SecretKey signInKey
    ) {
        Map<String, Object> claims = new HashMap<>(extraClaims);
        claims.put(TOKEN_TYPE_CLAIM, tokenType);
        return Jwts.builder()
                .claims(claims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(signInKey)
                .compact();
    }

    public boolean isAccessTokenValid(String token, UserDetails userDetails) {
        return isTokenValid(token, userDetails, ACCESS_TOKEN_TYPE);
    }

    public boolean isRefreshTokenValid(String token, UserDetails userDetails) {
        return isTokenValid(token, userDetails, REFRESH_TOKEN_TYPE);
    }

    private boolean isTokenValid(String token, UserDetails userDetails, String expectedTokenType) {
        Claims claims = extractAllClaimsByTokenType(token, expectedTokenType);
        final String username = claims.getSubject();
        final String tokenType = claims.get(TOKEN_TYPE_CLAIM, String.class);
        return username.equals(userDetails.getUsername())
                && expectedTokenType.equals(tokenType)
                && !claims.getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        try {
            return parseClaims(token, getAccessSignInKey());
        } catch (JwtException exception) {
            return parseClaims(token, getRefreshSignInKey());
        }
    }

    private Claims extractAllClaimsByTokenType(String token, String tokenType) {
        SecretKey signInKey = ACCESS_TOKEN_TYPE.equals(tokenType) ? getAccessSignInKey() : getRefreshSignInKey();
        return parseClaims(token, signInKey);
    }

    private Claims parseClaims(String token, SecretKey signInKey) {
        return Jwts
                .parser()
                .verifyWith(signInKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getAccessSignInKey() {
        return buildSignInKey(accessSecretKey);
    }

    private SecretKey getRefreshSignInKey() {
        return buildSignInKey(refreshSecretKey);
    }

    private SecretKey buildSignInKey(String secret) {
        byte[] bytes = Base64.getDecoder()
                .decode(secret.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
}
