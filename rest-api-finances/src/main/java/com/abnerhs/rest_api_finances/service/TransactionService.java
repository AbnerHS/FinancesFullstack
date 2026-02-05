package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.TransactionMapper;
import com.abnerhs.rest_api_finances.model.Transaction;
import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository repository;

    @Autowired
    private TransactionMapper mapper;

    @Transactional
    public TransactionResponseDTO create(TransactionRequestDTO dto){
        Transaction transaction = mapper.toEntity(dto);
        return mapper.toDto(repository.save(transaction));
    }

    public List<TransactionResponseDTO> findAllByPeriod(UUID periodId){
        List<Transaction> transactionList = repository.findByPeriodId(periodId);
        return mapper.toDtoList(transactionList);
    }

    public TransactionResponseDTO findById(UUID id){
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada"));
    }

    @Transactional
    public TransactionResponseDTO update(UUID id, TransactionRequestDTO dto){
        Transaction entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada"));
        mapper.updateEntityFromDto(dto, entity);
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public TransactionResponseDTO updatePartial(UUID id, Map<String, Object> updates) {
        Transaction transaction = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(("Transação não encontrada")));

        updates.forEach((key, value) -> {
            switch (key) {
                case "amount" -> transaction.setAmount(new BigDecimal(value.toString()));
                case "description" -> transaction.setDescription((String) value);
                case "type" -> transaction.setType(TransactionType.valueOf((String) value));
                case "responsibilityTag" -> transaction.setResponsibilityTag((String) value);
            }
        });

        return mapper.toDto(repository.save(transaction));
    }

    @Transactional
    public void delete(UUID id){
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Transação não encontrada para exclusão");
        }
        repository.deleteById(id);
    }
}
