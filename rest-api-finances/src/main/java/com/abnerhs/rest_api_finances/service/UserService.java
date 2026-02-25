package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.UserPasswordUpdateDTO;
import com.abnerhs.rest_api_finances.dto.UserRequestDTO;
import com.abnerhs.rest_api_finances.dto.UserResponseDTO;
import com.abnerhs.rest_api_finances.dto.UserUpdateDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.UserMapper;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository repository;

    @Autowired
    private UserMapper mapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    public UserResponseDTO create(UserRequestDTO dto) {
        User entity = mapper.toEntity(dto);
        entity.setPassword(passwordEncoder.encode(dto.password()));
        return mapper.toDto(repository.save(entity));
    }

    public List<UserResponseDTO> findAll() {
        return mapper.toDtoList(repository.findAll());
    }

    public UserResponseDTO findById(UUID id) {
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado!"));
    }

    @Transactional
    public UserResponseDTO update(UUID id, UserUpdateDTO dto) {
        User entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado!"));
        
        mapper.updateEntityFromDto(dto, entity);
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public void updatePassword(UUID id, UserPasswordUpdateDTO dto) {
        User entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado!"));

        if (!passwordEncoder.matches(dto.currentPassword(), entity.getPassword())) {
            throw new BadCredentialsException("Senha atual incorreta");
        }

        entity.setPassword(passwordEncoder.encode(dto.newPassword()));
        repository.save(entity);
    }
}