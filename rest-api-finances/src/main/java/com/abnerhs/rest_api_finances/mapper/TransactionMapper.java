package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.Transaction;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(componentModel = "spring", imports = { ResourceNotFoundException.class })
public abstract class TransactionMapper {

    @Autowired
    protected FinancialPeriodRepository periodRepository;

    @Autowired
    protected UserRepository userRepository;

    @Mapping(target = "period", expression = "java(periodRepository.findById(dto.periodId())" +
            ".orElseThrow(() -> new ResourceNotFoundException(\"Período não encontrado\")))")
    @Mapping(target = "responsibleUser", expression = "java(userRepository.findById(dto.responsibleUserId())" +
            ".orElseThrow(() -> new ResourceNotFoundException(\"Usuário não encontrado\")))")
    public abstract Transaction toEntity(TransactionRequestDTO dto);

    // Mapeamento de volta para quando precisar retornar o ID no DTO de resposta
    @Mapping(source = "period.id", target = "periodId")
    @Mapping(source = "responsibleUser.id", target = "responsibleUserId")
    public abstract TransactionResponseDTO toDto(Transaction entity);

    public abstract List<TransactionResponseDTO> toDtoList(List<Transaction> entityList);

    public abstract void updateEntityFromDto(TransactionRequestDTO dto, @MappingTarget Transaction entity);
}
