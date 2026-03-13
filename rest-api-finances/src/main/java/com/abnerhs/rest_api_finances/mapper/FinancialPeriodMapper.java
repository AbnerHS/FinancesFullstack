package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.FinancialPeriodRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.FinancialPeriod;
import com.abnerhs.rest_api_finances.repository.FinancialPlanRepository;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(componentModel = "spring", imports = { ResourceNotFoundException.class })
public abstract class FinancialPeriodMapper {

    @Autowired
    protected FinancialPlanRepository planRepository;

    @Mapping(target = "financialPlan", expression = "java(planRepository.findById(dto.financialPlanId())" +
            ".orElseThrow(() -> new ResourceNotFoundException(\"Plano Financeiro não encontrado\")))")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "monthlyBalance", ignore = true)
    @Mapping(target = "transactions", ignore = true)
    public abstract FinancialPeriod toEntity(FinancialPeriodRequestDTO dto);

    @Mapping(source = "financialPlan.id", target = "financialPlanId")
    public abstract FinancialPeriodResponseDTO toDto(FinancialPeriod entity);

    public abstract List<FinancialPeriodResponseDTO> toDtoList(List<FinancialPeriod> entityList);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "financialPlan", ignore = true)
    @Mapping(target = "monthlyBalance", ignore = true)
    @Mapping(target = "transactions", ignore = true)
    public abstract void updateEntityFromDto(FinancialPeriodRequestDTO dto, @MappingTarget FinancialPeriod entity);

    @AfterMapping
    protected void linkRelationship(FinancialPeriodRequestDTO dto, @MappingTarget FinancialPeriod entity) {
        if (dto.financialPlanId() != null) {
            entity.setFinancialPlan(
                    planRepository.findById(dto.financialPlanId())
                            .orElseThrow(() -> new ResourceNotFoundException("Plano Financeiro nao encontrado"))
            );
        }
    }
}
