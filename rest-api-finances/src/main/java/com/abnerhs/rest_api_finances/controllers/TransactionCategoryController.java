package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.TransactionCategoryAssembler;
import com.abnerhs.rest_api_finances.docs.ApiDeleteResponses;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPatchResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.docs.ApiPutResponses;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryRequestDTO;
import com.abnerhs.rest_api_finances.service.TransactionCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.IanaLinkRelations;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/transaction-categories")
@Tag(name = "Transaction Category", description = "Endpoints to manage Transaction Categories")
public class TransactionCategoryController {

    @Autowired
    private TransactionCategoryService service;

    @Autowired
    private TransactionCategoryAssembler assembler;

    @PostMapping
    @ApiPostResponses
    @Operation(summary = "Create a new Transaction Category", tags = {"Transaction Category"})
    public ResponseEntity<EntityModel<TransactionCategoryDTO>> create(@RequestBody @Valid TransactionCategoryRequestDTO dto) {
        TransactionCategoryDTO created = service.create(dto);
        EntityModel<TransactionCategoryDTO> model = assembler.toModel(created);

        return ResponseEntity
                .created(model.getRequiredLink(IanaLinkRelations.SELF).toUri())
                .body(model);
    }

    @GetMapping
    @ApiGetResponses
    @Operation(summary = "Find all Transaction Categories", tags = {"Transaction Category"})
    public CollectionModel<EntityModel<TransactionCategoryDTO>> getAll() {
        List<TransactionCategoryDTO> dtoList = service.findAll();
        return assembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(TransactionCategoryController.class).getAll()).withSelfRel());
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Find Transaction Category by ID", tags = {"Transaction Category"})
    public EntityModel<TransactionCategoryDTO> getById(@PathVariable UUID id) {
        return assembler.toModel(service.findById(id));
    }

    @PutMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update a Transaction Category by ID", tags = {"Transaction Category"})
    public ResponseEntity<EntityModel<TransactionCategoryDTO>> update(@PathVariable UUID id, @RequestBody @Valid TransactionCategoryRequestDTO dto) {
        return ResponseEntity.ok(assembler.toModel(service.update(id, dto)));
    }

    @PatchMapping("/{id}")
    @ApiPatchResponses
    @Operation(summary = "Update partial a Transaction Category by ID", tags = {"Transaction Category"})
    public ResponseEntity<EntityModel<TransactionCategoryDTO>> partialUpdate(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(assembler.toModel(service.updatePartial(id, updates)));
    }

    @DeleteMapping("/{id}")
    @ApiDeleteResponses
    @Operation(summary = "Delete a Transaction Category by ID", tags = {"Transaction Category"})
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
