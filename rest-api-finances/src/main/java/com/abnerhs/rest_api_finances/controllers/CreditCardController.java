package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.CreditCardAssembler;
import com.abnerhs.rest_api_finances.assembler.CreditCardInvoiceAssembler;
import com.abnerhs.rest_api_finances.docs.ApiDeleteResponses;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.docs.ApiPutResponses;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.service.CreditCardInvoiceService;
import com.abnerhs.rest_api_finances.service.CreditCardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.IanaLinkRelations;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/credit-cards")
@Tag(name = "Card", description = "Endpoints to manage Credit Cards")
public class CreditCardController {

    @Autowired
    private CreditCardService service;
    @Autowired
    private CreditCardAssembler assembler;

    @Autowired
    private CreditCardInvoiceService invoiceService;
    @Autowired
    private CreditCardInvoiceAssembler invoiceAssembler;

    @PostMapping
    @ApiPostResponses
    @Operation(summary = "Create a new Credit Card", tags = {"Card"})
    public ResponseEntity<EntityModel<CreditCardResponseDTO>> create(@RequestBody @Valid CreditCardRequestDTO dto) {
        CreditCardResponseDTO created = service.create(dto);
        EntityModel<CreditCardResponseDTO> model = assembler.toModel(created);

        return ResponseEntity
                .created(model.getRequiredLink(IanaLinkRelations.SELF).toUri())
                .body(model);
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Find a Credit Card by ID", tags = {"Card"})
    public EntityModel<CreditCardResponseDTO> getById(@PathVariable UUID id) {
        CreditCardResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @GetMapping("/{id}/invoices")
    @ApiGetResponses
    @Operation(summary = "Find Invoices by Credit Card", tags = {"Card", "Invoice"})
    public CollectionModel<EntityModel<CreditCardInvoiceResponseDTO>> getInvoicesByCreditCard(@PathVariable UUID id) {
        List<CreditCardInvoiceResponseDTO> dtoList = invoiceService.findAllByCreditCard(id);

        return invoiceAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(CreditCardController.class).getInvoicesByCreditCard(id)).withSelfRel());
    }

    @PutMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update a Credit Card by ID", tags = {"Card"})
    public ResponseEntity<EntityModel<CreditCardResponseDTO>> update(@PathVariable UUID id, @RequestBody @Validated(onUpdate.class) CreditCardRequestDTO dto) {
        CreditCardResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @PatchMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update partial a Credit Card by ID", tags = {"Card"})
    public ResponseEntity<EntityModel<CreditCardResponseDTO>> partialUpdate(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        CreditCardResponseDTO updated = service.updatePartial(id, updates);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @DeleteMapping("/{id}")
    @ApiDeleteResponses
    @Operation(summary = "Delete a Credit Card by ID", tags = {"Card"})
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
