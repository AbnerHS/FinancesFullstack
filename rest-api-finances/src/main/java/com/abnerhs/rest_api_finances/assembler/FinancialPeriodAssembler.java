package com.abnerhs.rest_api_finances.assembler;

import com.abnerhs.rest_api_finances.controllers.FinancialPeriodController;
import com.abnerhs.rest_api_finances.controllers.FinancialPlanController;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class FinancialPeriodAssembler implements SimpleRepresentationModelAssembler<FinancialPeriodResponseDTO> {

    @Override
    public void addLinks(EntityModel<FinancialPeriodResponseDTO> resource) {
        FinancialPeriodResponseDTO dto = resource.getContent();

        resource.add(linkTo(methodOn(FinancialPeriodController.class)
                .getById(dto.getId())).withSelfRel());

        resource.add(linkTo(methodOn(FinancialPlanController.class)
                .getById(dto.getFinancialPlanId())).withRel("plan"));

//        resouce.add(linkTo(methodOn(TransactionController.class))
    }

    @Override
    public void addLinks(CollectionModel<EntityModel<FinancialPeriodResponseDTO>> resources) {

    }
}
