package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.CreditCardRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.CreditCard;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(componentModel = "spring", imports = { ResourceNotFoundException.class })
public abstract class CreditCardMapper {

    @Autowired
    protected UserRepository userRepository;

    @Mapping(target = "user", expression = "java(userRepository.findById(dto.userId()).orElseThrow(() -> new ResourceNotFoundException(\"Usuário dono não encontrado: \" + dto.userId())))")
    public abstract CreditCard toEntity(CreditCardRequestDTO dto);

    @Mapping(source = "user.id", target = "userId")
    public abstract CreditCardResponseDTO toDto(CreditCard entity);

    public abstract List<CreditCardResponseDTO> toDtoList(List<CreditCard> entityList);

    @Mapping(target = "user", ignore = true)
    public abstract void updateEntityFromDto(CreditCardRequestDTO dto, @MappingTarget CreditCard entity);

    @AfterMapping
    protected void linkRelationShips(CreditCardRequestDTO dto, @MappingTarget CreditCard entity){
        if(dto.userId() != null){
            userRepository.findById(dto.userId())
                    .ifPresent(entity::setUser);
        }
    }
}
