package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.TransactionAssembler;
import com.abnerhs.rest_api_finances.docs.ApiDeleteResponses;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.docs.ApiPutResponses;
import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.IanaLinkRelations;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;


@RestController
@RequestMapping("/api/transactions")
@Tag(name = "Transaction", description = "Endpoints to manage Transactions")
public class TransactionController {

    @Autowired
    private TransactionService service;

    @Autowired
    private TransactionAssembler assembler;

    @PostMapping
    @ApiPostResponses
    @Operation(summary = "Create a new Transaction", tags = {"Transaction"})
    public ResponseEntity<EntityModel<TransactionResponseDTO>> create(@RequestBody @Valid TransactionRequestDTO dto) {
        TransactionResponseDTO created = service.create(dto);
        EntityModel<TransactionResponseDTO> model = assembler.toModel(created);

        return ResponseEntity
                .created(model.getRequiredLink(IanaLinkRelations.SELF).toUri())
                .body(model);
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Get a Transaction By ID", tags = {"Transaction"})
    public EntityModel<TransactionResponseDTO> getById(@PathVariable UUID id) {
        TransactionResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @PutMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update a Transaction by ID", tags = {"Transaction"})
    public ResponseEntity<EntityModel<TransactionResponseDTO>> update(@PathVariable UUID id, @RequestBody @Validated(onUpdate.class) TransactionRequestDTO dto) {
        TransactionResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @PatchMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update partial a Transaction by ID", tags = {"Transaction"})
    public ResponseEntity<EntityModel<TransactionResponseDTO>> partialUpdate(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        TransactionResponseDTO updated = service.updatePartial(id, updates);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @DeleteMapping("/{id}")
    @ApiDeleteResponses
    @Operation(summary = "Delete a Transaction by ID", tags = {"Transaction"})
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

}
