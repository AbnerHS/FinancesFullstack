package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.UserRequestDTO;
import com.abnerhs.rest_api_finances.dto.UserResponseDTO;
import com.abnerhs.rest_api_finances.dto.UserUpdateDTO;
import com.abnerhs.rest_api_finances.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", ignore = true) // Senha deve ser codificada no serviço
    User toEntity(UserRequestDTO dto);

    UserResponseDTO toDto(User entity);

    List<UserResponseDTO> toDtoList(List<User> userList);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", ignore = true)
    void updateEntityFromDto(UserUpdateDTO dto, @MappingTarget User entity);
}