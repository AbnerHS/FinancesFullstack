package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.Transaction;
import com.abnerhs.rest_api_finances.repository.CreditCardInvoiceRepository;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(componentModel = "spring", imports = {ResourceNotFoundException.class})
public abstract class TransactionMapper {

    @Autowired
    protected FinancialPeriodRepository periodRepository;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected CreditCardInvoiceRepository invoiceRepository;

    @Mapping(target = "period", expression = "java(dto.periodId() != null ? periodRepository.findById(dto.periodId())"
            + ".orElseThrow(() -> new ResourceNotFoundException(\"PerÃ­odo nÃ£o encontrado\")) : null)")
    @Mapping(target = "responsibleUser", expression = "java(dto.responsibleUserId() != null ? userRepository.findById(dto.responsibleUserId())"
            + ".orElseThrow(() -> new ResourceNotFoundException(\"UsuÃ¡rio nÃ£o encontrado\")) : null)")
    @Mapping(target = "creditCardInvoice", expression = "java(dto.creditCardInvoiceId() != null ? invoiceRepository.findById(dto.creditCardInvoiceId())"
            + ".orElseThrow(() -> new ResourceNotFoundException(\"Fatura nÃ£o encontrada\")) : null)")
    @Mapping(target = "transactionCategory", ignore = true)
    @Mapping(target = "clearedByInvoice", source = "isClearedByInvoice", defaultValue = "false")
    @Mapping(target = "paymentStatus", source = "paymentStatus", defaultValue = "PENDING")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "dateTime", ignore = true)
    public abstract Transaction toEntity(TransactionRequestDTO dto);

    @Mapping(source = "period.id", target = "periodId")
    @Mapping(source = "responsibleUser.id", target = "responsibleUserId")
    @Mapping(target = "category", expression = "java(toCategoryDto(entity))")
    @Mapping(source = "clearedByInvoice", target = "isClearedByInvoice")
    @Mapping(source = "creditCardInvoice.id", target = "creditCardInvoiceId")
    public abstract TransactionResponseDTO toDto(Transaction entity);

    public abstract List<TransactionResponseDTO> toDtoList(List<Transaction> entityList);

    @Mapping(target = "transactionCategory", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "dateTime", ignore = true)
    @Mapping(target = "period", ignore = true)
    @Mapping(target = "responsibleUser", ignore = true)
    @Mapping(target = "creditCardInvoice", ignore = true)
    @Mapping(target = "clearedByInvoice", ignore = true)
    @Mapping(target = "paymentStatus", ignore = true)
    public abstract void updateEntityFromDto(TransactionRequestDTO dto, @MappingTarget Transaction entity);

    @AfterMapping
    protected void linkRelationships(TransactionRequestDTO dto, @MappingTarget Transaction entity) {
        if (dto.periodId() != null) {
            entity.setPeriod(
                    periodRepository.findById(dto.periodId())
                            .orElseThrow(() -> new ResourceNotFoundException("Periodo nao encontrado"))
            );
        }

        if (dto.responsibleUserId() != null) {
            entity.setResponsibleUser(
                    userRepository.findById(dto.responsibleUserId())
                            .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"))
            );
        } else {
            entity.setResponsibleUser(null);
        }

        if (dto.creditCardInvoiceId() != null) {
            entity.setCreditCardInvoice(
                    invoiceRepository.findById(dto.creditCardInvoiceId())
                            .orElseThrow(() -> new ResourceNotFoundException("Fatura nao encontrada"))
            );
        } else {
            entity.setCreditCardInvoice(null);
        }

        entity.setClearedByInvoice(Boolean.TRUE.equals(dto.isClearedByInvoice()));
        entity.setPaymentStatus(dto.paymentStatus() != null ? dto.paymentStatus() : com.abnerhs.rest_api_finances.model.enums.PaymentStatus.PENDING);
    }

    protected TransactionCategoryDTO toCategoryDto(Transaction entity) {
        if (entity.getTransactionCategory() == null) {
            return null;
        }

        return new TransactionCategoryDTO(
                entity.getTransactionCategory().getId(),
                entity.getTransactionCategory().getName()
        );
    }
}
