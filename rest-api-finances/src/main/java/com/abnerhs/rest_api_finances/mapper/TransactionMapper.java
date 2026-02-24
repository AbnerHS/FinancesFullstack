package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.Transaction;
import com.abnerhs.rest_api_finances.repository.CreditCardInvoiceRepository;
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

    @Autowired
    protected CreditCardInvoiceRepository invoiceRepository;

    @Mapping(target = "period", expression = "java(dto.periodId() != null ? periodRepository.findById(dto.periodId())" +
            ".orElseThrow(() -> new ResourceNotFoundException(\"Período não encontrado\")) : null)")
    @Mapping(target = "responsibleUser", expression = "java(dto.responsibleUserId() != null ? userRepository.findById(dto.responsibleUserId())" +
            ".orElseThrow(() -> new ResourceNotFoundException(\"Usuário não encontrado\")) : null)")
    @Mapping(target = "creditCardInvoice", expression = "java(dto.creditCardInvoiceId() != null ? invoiceRepository.findById(dto.creditCardInvoiceId())" +
            ".orElseThrow(() -> new ResourceNotFoundException(\"Fatura não encontrada\")) : null)")
    @Mapping(target = "clearedByInvoice", source = "isClearedByInvoice", defaultValue = "false")
    public abstract Transaction toEntity(TransactionRequestDTO dto);

    @Mapping(source = "period.id", target = "periodId")
    @Mapping(source = "responsibleUser.id", target = "responsibleUserId")
    @Mapping(source = "clearedByInvoice", target = "isClearedByInvoice")
    @Mapping(source = "creditCardInvoice.id", target = "creditCardInvoiceId")
    public abstract TransactionResponseDTO toDto(Transaction entity);

    public abstract List<TransactionResponseDTO> toDtoList(List<Transaction> entityList);

    public abstract void updateEntityFromDto(TransactionRequestDTO dto, @MappingTarget Transaction entity);
}