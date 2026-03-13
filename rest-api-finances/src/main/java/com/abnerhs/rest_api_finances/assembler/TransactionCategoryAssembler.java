package com.abnerhs.rest_api_finances.assembler;

import com.abnerhs.rest_api_finances.controllers.TransactionCategoryController;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class TransactionCategoryAssembler implements SimpleRepresentationModelAssembler<TransactionCategoryDTO> {

    @Override
    public void addLinks(EntityModel<TransactionCategoryDTO> resource) {
        TransactionCategoryDTO dto = resource.getContent();

        if (dto == null) {
            return;
        }

        resource.add(linkTo(methodOn(TransactionCategoryController.class)
                .getById(dto.id())).withSelfRel());
        resource.add(linkTo(methodOn(TransactionCategoryController.class)
                .getAll()).withRel("categories"));
    }

    @Override
    public void addLinks(CollectionModel<EntityModel<TransactionCategoryDTO>> resources) {
    }
}
