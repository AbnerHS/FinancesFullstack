package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.UserDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.UserMapper;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository repository;

    @Autowired
    private UserMapper mapper;

    @Transactional
    public UserDTO create(UserDTO dto) {
        User entity = mapper.toEntity(dto);
        return mapper.toDto(repository.save(entity));
    }

    public List<UserDTO> findAll() {
        return mapper.toDtoList(repository.findAll());
    }

    public UserDTO findById(UUID id) {
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado!"));
    }
}
