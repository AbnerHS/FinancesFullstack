package com.abnerhs.rest_api_finances.assembler;

import com.abnerhs.rest_api_finances.controllers.UserController;
import com.abnerhs.rest_api_finances.dto.UserResponseDTO;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class UserAssembler implements SimpleRepresentationModelAssembler<UserResponseDTO> {

    @Override
    public void addLinks(EntityModel<UserResponseDTO> resource) {
        UserResponseDTO dto = resource.getContent();

        resource.add(linkTo(methodOn(UserController.class)
                .getById(dto.id())).withSelfRel());

        resource.add(linkTo(methodOn(UserController.class)
                .getPlansByUser(dto.id())).withRel("plans"));

        resource.add(linkTo(methodOn(UserController.class)
                .getCreditCardsByUser(dto.id())).withRel("credit-cards"));
    }

    @Override
    public void addLinks(CollectionModel<EntityModel<UserResponseDTO>> resources) {
        // Links para a coleção, se necessário
    }
}