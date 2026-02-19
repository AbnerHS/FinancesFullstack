package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.CreditCardInvoice;
import com.abnerhs.rest_api_finances.repository.CreditCardRepository;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(componentModel = "spring", imports = { ResourceNotFoundException.class })
public abstract class CreditCardInvoiceMapper {

    @Autowired
    protected CreditCardRepository creditCardRepository;

    @Autowired
    protected FinancialPeriodRepository financialPeriodRepository;

    @Mapping(target = "creditCard", expression = "java(creditCardRepository.findById(dto.creditCardId()).orElseThrow(() -> new ResourceNotFoundException(\"Credit Card not found\")))")
    @Mapping(target = "period", expression = "java(financialPeriodRepository.findById(dto.periodId()).orElseThrow(() -> new ResourceNotFoundException(\"Financial Period not found\")))")
    public abstract CreditCardInvoice toEntity(CreditCardInvoiceRequestDTO dto);

    @Mapping(source = "creditCard.id", target = "creditCardId")
    @Mapping(source = "period.id", target = "periodId")
    public abstract CreditCardInvoiceResponseDTO toDto(CreditCardInvoice entity);

    public abstract List<CreditCardInvoiceResponseDTO> toDtoList(List<CreditCardInvoice> entityList);

    @Mapping(target = "creditCard", ignore = true)
    @Mapping(target = "period", ignore = true)
    public abstract void updateEntityFromDto(CreditCardInvoiceRequestDTO dto, @MappingTarget CreditCardInvoice entity);

    @AfterMapping
    protected void linkRelationShips(CreditCardInvoiceRequestDTO dto, @MappingTarget CreditCardInvoice entity){
        if(dto.creditCardId() != null){
            creditCardRepository.findById(dto.creditCardId())
                    .ifPresent(entity::setCreditCard);
        }

        if(dto.periodId() != null){
            financialPeriodRepository.findById(dto.periodId())
                    .ifPresent(entity::setPeriod);
        }
    }
}
