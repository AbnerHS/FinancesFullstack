package com.abnerhs.rest_api_finances.mapper;

import com.abnerhs.rest_api_finances.dto.UserDTO;
import com.abnerhs.rest_api_finances.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "id", ignore = true)
    User toEntity(UserDTO dto);

    @Mapping(target = "password", ignore = true)
    UserDTO toDto(User entity);

    List<UserDTO> toDtoList(List<User> userList);
}
