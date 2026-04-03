package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.TransactionAssembler;
import com.abnerhs.rest_api_finances.docs.ApiDeleteResponses;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPatchResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.docs.ApiPutResponses;
import com.abnerhs.rest_api_finances.dto.RecurringTransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionDocumentScope;
import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.service.StoredBillingDocument;
import com.abnerhs.rest_api_finances.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.IanaLinkRelations;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
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

    @PostMapping("/recurring")
    @ApiPostResponses
    @Operation(summary = "Create recurring Transactions", tags = {"Transaction"})
    public ResponseEntity<List<EntityModel<TransactionResponseDTO>>> createRecurring(@RequestBody @Valid RecurringTransactionRequestDTO dto) {
        List<TransactionResponseDTO> created = service.createRecurring(dto);
        List<EntityModel<TransactionResponseDTO>> models = created.stream()
                .map(assembler::toModel)
                .toList();

        return ResponseEntity.ok(models);
    }

    @PostMapping(value = "/{id}/billing-document/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ApiPostResponses
    @Operation(summary = "Upload a billing document file to a transaction", tags = {"Transaction"})
    public ResponseEntity<EntityModel<TransactionResponseDTO>> uploadBillingDocument(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "scope", defaultValue = "SINGLE") TransactionDocumentScope scope
    ) {
        TransactionResponseDTO updated = service.uploadBillingDocument(id, file, scope);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Get a Transaction By ID", tags = {"Transaction"})
    public EntityModel<TransactionResponseDTO> getById(@PathVariable UUID id) {
        TransactionResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @GetMapping("/{id}/billing-document/download")
    @ApiGetResponses
    @Operation(summary = "Download a billing document file", tags = {"Transaction"})
    public ResponseEntity<InputStreamResource> downloadBillingDocument(@PathVariable UUID id) {
        StoredBillingDocument document = service.downloadBillingDocument(id);
        MediaType mediaType = MediaType.parseMediaType(
                document.mimeType() == null || document.mimeType().isBlank()
                        ? MediaType.APPLICATION_OCTET_STREAM_VALUE
                        : document.mimeType()
        );

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.fileName() + "\"")
                .body(new InputStreamResource(document.inputStream()));
    }

    @PutMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update a Transaction by ID", tags = {"Transaction"})
    public ResponseEntity<EntityModel<TransactionResponseDTO>> update(@PathVariable UUID id, @RequestBody @Validated(onUpdate.class) TransactionRequestDTO dto) {
        TransactionResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @PatchMapping("/{id}")
    @ApiPatchResponses
    @Operation(summary = "Update partial a Transaction by ID", tags = {"Transaction"})
    public ResponseEntity<EntityModel<TransactionResponseDTO>> partialUpdate(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        TransactionResponseDTO updated = service.updatePartial(id, updates);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @DeleteMapping("/{id}/billing-document")
    @ApiDeleteResponses
    @Operation(summary = "Delete a billing document from a transaction", tags = {"Transaction"})
    public ResponseEntity<EntityModel<TransactionResponseDTO>> deleteBillingDocument(
            @PathVariable UUID id,
            @RequestParam(name = "scope", defaultValue = "SINGLE") TransactionDocumentScope scope
    ) {
        TransactionResponseDTO updated = service.deleteBillingDocument(id, scope);
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
