package com.abnerhs.rest_api_finances.assembler;

import com.abnerhs.rest_api_finances.controllers.FinancialPeriodController;
import com.abnerhs.rest_api_finances.controllers.FinancialPlanController;
import com.abnerhs.rest_api_finances.controllers.UserController;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class FinancialPlanAssembler implements SimpleRepresentationModelAssembler<FinancialPlanResponseDTO> {

    @Override
    public void addLinks(EntityModel<FinancialPlanResponseDTO> resource) {
        FinancialPlanResponseDTO dto = resource.getContent();

        resource.add(linkTo(methodOn(FinancialPlanController.class)
                .getById(dto.getId())).withSelfRel());

        resource.add(linkTo(methodOn(FinancialPeriodController.class)
                .getAllByPlanId(dto.getId())).withRel("periods"));

        resource.add(linkTo(methodOn(UserController.class).getById(dto.getOwnerId()))
                .withRel("owner"));
    }

    @Override
    public void addLinks(CollectionModel<EntityModel<FinancialPlanResponseDTO>> resources) {

    }
}
