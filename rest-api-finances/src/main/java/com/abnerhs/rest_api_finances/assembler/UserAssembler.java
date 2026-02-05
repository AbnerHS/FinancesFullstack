package com.abnerhs.rest_api_finances.assembler;

import com.abnerhs.rest_api_finances.controllers.UserController;
import com.abnerhs.rest_api_finances.dto.UserDTO;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class UserAssembler implements SimpleRepresentationModelAssembler<UserDTO> {

    @Override
    public void addLinks(EntityModel<UserDTO> resource) {
        UserDTO dto = resource.getContent();

        resource.add(linkTo(methodOn(UserController.class)
                .getById(dto.id())).withSelfRel());

        resource.add(linkTo(methodOn(UserController.class)
                .getPlansByUser(dto.id())).withRel("plans"));

        resource.add(linkTo(methodOn(UserController.class)
                .getCreditCardsByUser(dto.id())).withRel("credit-cards"));
    }

    @Override
    public void addLinks(CollectionModel<EntityModel<UserDTO>> resources) {

    }
}
