package com.abnerhs.rest_api_finances.assembler;

import com.abnerhs.rest_api_finances.controllers.TransactionController;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class TransactionAssembler implements SimpleRepresentationModelAssembler<TransactionResponseDTO> {

    @Override
    public void addLinks(EntityModel<TransactionResponseDTO> resource) {
        TransactionResponseDTO dto = resource.getContent();

        resource.add(linkTo(methodOn(TransactionController.class)
                .getById(dto.id())).withSelfRel());
    }

    @Override
    public void addLinks(CollectionModel<EntityModel<TransactionResponseDTO>> resources) {

    }
}
