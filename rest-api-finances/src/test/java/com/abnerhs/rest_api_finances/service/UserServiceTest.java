package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.UserPasswordUpdateDTO;
import com.abnerhs.rest_api_finances.dto.UserRequestDTO;
import com.abnerhs.rest_api_finances.dto.UserResponseDTO;
import com.abnerhs.rest_api_finances.dto.UserUpdateDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.UserMapper;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository repository;

    @Mock
    private UserMapper mapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService service;

    @Test
    void shouldCreateUserWithEncodedPassword() {
        UserRequestDTO dto = new UserRequestDTO("John", "john@example.com", "secret123");
        User entity = new User(dto.email(), null, dto.name());
        User savedEntity = new User(dto.email(), "encoded", dto.name());
        UserResponseDTO response = new UserResponseDTO(UUID.randomUUID(), dto.name(), dto.email());

        when(mapper.toEntity(dto)).thenReturn(entity);
        when(passwordEncoder.encode(dto.password())).thenReturn("encoded");
        when(repository.save(entity)).thenReturn(savedEntity);
        when(mapper.toDto(savedEntity)).thenReturn(response);

        UserResponseDTO result = service.create(dto);

        assertEquals(response, result);
        assertEquals("encoded", entity.getPassword());
    }

    @Test
    void shouldReturnAllUsers() {
        List<User> users = List.of(new User("john@example.com", "encoded", "John"));
        List<UserResponseDTO> response = List.of(new UserResponseDTO(UUID.randomUUID(), "John", "john@example.com"));

        when(repository.findAll()).thenReturn(users);
        when(mapper.toDtoList(users)).thenReturn(response);

        assertEquals(response, service.findAll());
    }

    @Test
    void shouldFindUserById() {
        UUID id = UUID.randomUUID();
        User user = new User("john@example.com", "encoded", "John");
        UserResponseDTO response = new UserResponseDTO(id, "John", "john@example.com");

        when(repository.findById(id)).thenReturn(Optional.of(user));
        when(mapper.toDto(user)).thenReturn(response);

        assertEquals(response, service.findById(id));
    }

    @Test
    void shouldThrowWhenUserIsNotFoundById() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.findById(id));
    }

    @Test
    void shouldUpdateUser() {
        UUID id = UUID.randomUUID();
        UserUpdateDTO dto = new UserUpdateDTO("John Updated", "john.updated@example.com");
        User user = new User("john@example.com", "encoded", "John");
        UserResponseDTO response = new UserResponseDTO(id, dto.name(), dto.email());

        when(repository.findById(id)).thenReturn(Optional.of(user));
        when(repository.save(user)).thenReturn(user);
        when(mapper.toDto(user)).thenReturn(response);

        UserResponseDTO result = service.update(id, dto);

        verify(mapper).updateEntityFromDto(dto, user);
        assertEquals(response, result);
    }

    @Test
    void shouldUpdatePasswordWhenCurrentPasswordMatches() {
        UUID id = UUID.randomUUID();
        User user = new User("john@example.com", "encoded", "John");
        UserPasswordUpdateDTO dto = new UserPasswordUpdateDTO("current-secret", "new-secret");

        when(repository.findById(id)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(dto.currentPassword(), user.getPassword())).thenReturn(true);
        when(passwordEncoder.encode(dto.newPassword())).thenReturn("new-encoded");

        service.updatePassword(id, dto);

        assertEquals("new-encoded", user.getPassword());
        verify(repository).save(user);
    }

    @Test
    void shouldRejectPasswordUpdateWhenCurrentPasswordDoesNotMatch() {
        UUID id = UUID.randomUUID();
        User user = new User("john@example.com", "encoded", "John");
        UserPasswordUpdateDTO dto = new UserPasswordUpdateDTO("wrong-secret", "new-secret");

        when(repository.findById(id)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(dto.currentPassword(), user.getPassword())).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> service.updatePassword(id, dto));
        verify(repository, never()).save(any());
    }
}
