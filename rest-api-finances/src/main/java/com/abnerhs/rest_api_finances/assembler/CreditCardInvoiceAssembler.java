package com.abnerhs.rest_api_finances.assembler;

import com.abnerhs.rest_api_finances.controllers.CreditCardController;
import com.abnerhs.rest_api_finances.controllers.CreditCardInvoiceController;
import com.abnerhs.rest_api_finances.controllers.FinancialPeriodController;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class CreditCardInvoiceAssembler implements SimpleRepresentationModelAssembler<CreditCardInvoiceResponseDTO> {
    @Override
    public void addLinks(EntityModel<CreditCardInvoiceResponseDTO> resource) {
        CreditCardInvoiceResponseDTO dto = resource.getContent();

        resource.add(linkTo(methodOn(CreditCardInvoiceController.class)
                .getById(dto.id())).withSelfRel());

        resource.add(linkTo(methodOn(FinancialPeriodController.class)
                .getById(dto.periodId())).withRel("period"));
        resource.add(linkTo(methodOn(CreditCardController.class)
                .getById(dto.creditCardId())).withRel("card"));
    }

    @Override
    public void addLinks(CollectionModel<EntityModel<CreditCardInvoiceResponseDTO>> resources) {

    }
}
