package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.mapper.TransactionMapper;
import com.abnerhs.rest_api_finances.model.FinancialPeriod;
import com.abnerhs.rest_api_finances.model.Transaction;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository repository;

    @Autowired
    private TransactionMapper mapper;

    @Transactional
    public TransactionResponseDTO create(TransactionRequestDTO dto){
        System.out.println("DTO recebido: " + dto); // Veja se os dados chegaram aqui
        Transaction transaction = mapper.toEntity(dto);
        System.out.println("Entity após mapeamento: " + transaction.getDescription()); // Veja se o mapper funcionou
        return mapper.toDto(repository.save(transaction));
    }
}
