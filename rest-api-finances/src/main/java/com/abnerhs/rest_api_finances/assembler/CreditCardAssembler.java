package com.abnerhs.rest_api_finances.assembler;

import com.abnerhs.rest_api_finances.controllers.CreditCardController;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.server.SimpleRepresentationModelAssembler;
import org.springframework.stereotype.Component;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@Component
public class CreditCardAssembler implements SimpleRepresentationModelAssembler<CreditCardResponseDTO> {

    @Override
    public void addLinks(EntityModel<CreditCardResponseDTO> resource) {
        CreditCardResponseDTO dto = resource.getContent();

        resource.add(linkTo(methodOn(CreditCardController.class)
                .getById(dto.id())).withSelfRel());

        resource.add(linkTo(methodOn(CreditCardController.class)
                .getInvoicesByCreditCard(dto.id())).withRel("invoices"));
    }

    @Override
    public void addLinks(CollectionModel<EntityModel<CreditCardResponseDTO>> resources) {
        // Sem links adicionais para a coleção por enquanto
    }
}
