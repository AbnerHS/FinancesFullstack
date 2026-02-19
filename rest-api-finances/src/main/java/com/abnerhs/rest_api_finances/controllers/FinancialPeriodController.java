package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.FinancialPeriodAssembler;
import com.abnerhs.rest_api_finances.assembler.TransactionAssembler;
import com.abnerhs.rest_api_finances.docs.ApiDeleteResponses;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.docs.ApiPutResponses;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.service.FinancialPeriodService;
import com.abnerhs.rest_api_finances.service.TransactionService;
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
@RequestMapping("/api/periods")
@Tag(name = "Period", description = "Endpoints to manage Financial Periods")
public class FinancialPeriodController {

    @Autowired
    private FinancialPeriodService service;
    @Autowired
    private FinancialPeriodAssembler assembler;

    @Autowired
    private TransactionService transactionService;
    @Autowired
    private TransactionAssembler transactionAssembler;

    @PostMapping
    @ApiPostResponses
    @Operation(summary = "Create a new Financial Period", tags = {"Period"})
    public ResponseEntity<EntityModel<FinancialPeriodResponseDTO>> create(@RequestBody @Valid FinancialPeriodRequestDTO dto) {
        FinancialPeriodResponseDTO created = service.create(dto);
        EntityModel<FinancialPeriodResponseDTO> model = assembler.toModel(created);

        return ResponseEntity
                .created(model.getRequiredLink(IanaLinkRelations.SELF).toUri())
                .body(model);
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Find a Financial Period by ID", tags = {"Period"})
    public EntityModel<FinancialPeriodResponseDTO> getById(@PathVariable UUID id) {
        FinancialPeriodResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @GetMapping("/{id}/transactions")
    @ApiGetResponses
    @Operation(summary = "Find Transactions by Financial Period", tags = {"Period", "Transaction"})
    public CollectionModel<EntityModel<TransactionResponseDTO>> getByPeriod(@PathVariable UUID id) {
        List<TransactionResponseDTO> dtoList = transactionService.findAllByPeriod(id);
        return transactionAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(FinancialPeriodController.class).getByPeriod(id)).withSelfRel());
    }

    @PutMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update a Financial Period By ID", tags = {"Period"})
    public ResponseEntity<EntityModel<FinancialPeriodResponseDTO>> update(@PathVariable UUID id, @RequestBody FinancialPeriodRequestDTO dto){
        FinancialPeriodResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @PatchMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update partial a Financial Period By ID", tags = {"Period"})
    public ResponseEntity<EntityModel<FinancialPeriodResponseDTO>> updatePartial(@PathVariable UUID id, @RequestBody Map<String, Object> updates){
        FinancialPeriodResponseDTO updated = service.updatePartial(id, updates);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @DeleteMapping("/{id}")
    @ApiDeleteResponses
    @Operation(summary = "Delete a Financial Period by ID", tags = {"Period"})
    public ResponseEntity<Void> delete(@PathVariable UUID id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

}
