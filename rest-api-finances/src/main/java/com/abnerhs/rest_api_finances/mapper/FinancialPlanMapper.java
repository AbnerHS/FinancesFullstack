package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.model.FinancialPlan;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring")
public abstract class FinancialPlanMapper {

    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "partners", ignore = true)
    @Mapping(target = "activeInviteToken", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "periods", ignore = true)
    public abstract FinancialPlan toEntity(FinancialPlanRequestDTO dto);

    @Mapping(source = "owner.id", target = "ownerId")
    @Mapping(target = "partnerIds", expression = "java(toPartnerIds(entity))")
    public abstract FinancialPlanResponseDTO toDto(FinancialPlan entity);

    public abstract List<FinancialPlanResponseDTO> toDtoList(List<FinancialPlan> entityList);

    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "partners", ignore = true)
    @Mapping(target = "activeInviteToken", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "periods", ignore = true)
    public abstract void updateEntityFromDto(FinancialPlanRequestDTO dto, @MappingTarget FinancialPlan entity);

    @AfterMapping
    protected void normalizeName(FinancialPlanRequestDTO dto, @MappingTarget FinancialPlan entity) {
        if (dto.name() != null) {
            entity.setName(dto.name().trim());
        }
    }

    protected List<UUID> toPartnerIds(FinancialPlan entity) {
        return entity.getPartners().stream()
                .map(user -> user.getId())
                .toList();
    }
}
