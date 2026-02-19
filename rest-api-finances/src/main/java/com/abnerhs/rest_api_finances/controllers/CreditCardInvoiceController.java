package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.CreditCardInvoiceAssembler;
import com.abnerhs.rest_api_finances.docs.ApiDeleteResponses;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.docs.ApiPutResponses;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.service.CreditCardInvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.IanaLinkRelations;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/credit-card-invoices")
@Tag(name = "Invoice", description = "Endpoints to manage Credit Card Invoices")
public class CreditCardInvoiceController {

    @Autowired
    private CreditCardInvoiceService service;

    @Autowired
    private CreditCardInvoiceAssembler assembler;

    @PostMapping
    @ApiPostResponses
    @Operation(summary = "Create a new Invoice", tags = {"Invoice"})
    public ResponseEntity<EntityModel<CreditCardInvoiceResponseDTO>> create(
            @RequestBody @Valid CreditCardInvoiceRequestDTO dto) {

        CreditCardInvoiceResponseDTO created = service.create(dto);
        EntityModel<CreditCardInvoiceResponseDTO> model = assembler.toModel(created);

        return ResponseEntity
                .created(model.getRequiredLink(IanaLinkRelations.SELF).toUri())
                .body(model);
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Get an Invoice by ID", tags = {"Invoice"})
    public EntityModel<CreditCardInvoiceResponseDTO> getById(@PathVariable UUID id) {
        CreditCardInvoiceResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @PutMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update an Invoice by ID", tags = {"Invoice"})
    public ResponseEntity<EntityModel<CreditCardInvoiceResponseDTO>> update(
            @PathVariable UUID id,
            @RequestBody @Validated(onUpdate.class) CreditCardInvoiceRequestDTO dto) {

        CreditCardInvoiceResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

//    @PatchMapping("/{id}")
//    @ApiPutResponses
//    @Operation(summary = "Partial update an Invoice by ID", tags = {"Invoice"})
//    public ResponseEntity<EntityModel<CreditCardInvoiceResponseDTO>> partialUpdate(
//            @PathVariable UUID id,
//            @RequestBody Map<String, Object> updates) {
//
//        CreditCardInvoiceResponseDTO updated = service.updatePartial(id, updates);
//        return ResponseEntity.ok(assembler.toModel(updated));
//    }

    @DeleteMapping("/{id}")
    @ApiDeleteResponses
    @Operation(summary = "Delete an Invoice by ID", tags = {"Invoice"})
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}