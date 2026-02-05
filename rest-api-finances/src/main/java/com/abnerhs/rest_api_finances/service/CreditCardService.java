package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.CreditCardRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.CreditCardMapper;
import com.abnerhs.rest_api_finances.model.CreditCard;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.CreditCardRepository;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CreditCardService {

    @Autowired
    private CreditCardRepository repository;

    @Autowired
    private CreditCardMapper mapper;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public CreditCardResponseDTO create(CreditCardRequestDTO dto) {
        CreditCard entity = mapper.toEntity(dto);
        return mapper.toDto(repository.save(entity));
    }

    public List<CreditCardResponseDTO> findAllByUser(UUID userId) {
        List<CreditCard> cards = repository.findByUserId(userId);
        return mapper.toDtoList(cards);
    }

    public CreditCardResponseDTO findById(UUID id) {
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));
    }

    @Transactional
    public CreditCardResponseDTO update(UUID id, CreditCardRequestDTO dto) {
        CreditCard entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));
        mapper.updateEntityFromDto(dto, entity);
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public CreditCardResponseDTO updatePartial(UUID id, Map<String, Object> updates) {
        CreditCard card = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cartão não encontrado"));

        updates.forEach((key, value) -> {
            switch (key) {
                case "name" -> card.setName((String) value);
                case "userId" -> {
                    User user = userRepository.findById(UUID.fromString(value.toString()))
                            .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado!"));
                    card.setUser(user);
                }
            }
        });

        return mapper.toDto(repository.save(card));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Cartão não encontrado para exclusão");
        }
        repository.deleteById(id);
    }
}
