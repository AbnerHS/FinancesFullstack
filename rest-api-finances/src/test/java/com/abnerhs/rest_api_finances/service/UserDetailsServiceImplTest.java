package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private UserRepository repository;

    @InjectMocks
    private UserDetailsServiceImpl service;

    @Test
    void shouldLoadUserByUsername() {
        User user = new User("john@example.com", "encoded", "John");
        when(repository.findByEmail("john@example.com")).thenReturn(Optional.of(user));

        UserDetails result = service.loadUserByUsername("john@example.com");

        assertEquals(user, result);
    }

    @Test
    void shouldThrowWhenUsernameIsNotFound() {
        when(repository.findByEmail("john@example.com")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("john@example.com"));
    }
}
