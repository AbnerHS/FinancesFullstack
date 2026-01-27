package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.TransactionAssembler;
import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.IanaLinkRelations;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;


@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService service;

    @Autowired
    private TransactionAssembler assembler;

    @PostMapping
    public ResponseEntity<EntityModel<TransactionResponseDTO>> create(@RequestBody @Valid TransactionRequestDTO dto) {
        TransactionResponseDTO created = service.create(dto);
        EntityModel<TransactionResponseDTO> model = assembler.toModel(created);

        return ResponseEntity
                .created(model.getRequiredLink(IanaLinkRelations.SELF).toUri())
                .body(model);
    }

    @GetMapping("/{id}")
    public EntityModel<TransactionResponseDTO> getById(@PathVariable UUID id) {
        TransactionResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EntityModel<TransactionResponseDTO>> update(@PathVariable UUID id, @RequestBody @Validated(onUpdate.class) TransactionRequestDTO dto) {
        TransactionResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

}
