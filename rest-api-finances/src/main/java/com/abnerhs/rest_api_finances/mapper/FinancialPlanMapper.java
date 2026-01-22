package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.FinancialPlan;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(componentModel = "spring", imports = { ResourceNotFoundException.class })
public abstract class FinancialPlanMapper {

    @Autowired
    protected UserRepository userRepository;

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "owner", expression = "java(userRepository.findById(dto.ownerId()).orElseThrow(() -> new ResourceNotFoundException(\"Usuário dono não encontrado com o ID: \" + dto.ownerId())))")
    @Mapping(target = "partner", expression = "java(dto.partnerId() != null ? userRepository.findById(dto.partnerId()).orElse(null) : null)")
    public abstract FinancialPlan toEntity(FinancialPlanRequestDTO dto);

    @Mapping(source = "owner.id", target = "ownerId")
    @Mapping(source = "owner.name", target = "ownerName")
    @Mapping(source = "partner.id", target = "partnerId")
    @Mapping(source = "partner.name", target = "partnerName")
    public abstract FinancialPlanResponseDTO toDto(FinancialPlan entity);

    public abstract List<FinancialPlanResponseDTO> toDtoList(List<FinancialPlan> entities);
}
