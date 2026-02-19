package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.FinancialPeriodAssembler;
import com.abnerhs.rest_api_finances.assembler.FinancialPlanAssembler;
import com.abnerhs.rest_api_finances.docs.ApiDeleteResponses;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.docs.ApiPutResponses;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.service.FinancialPeriodService;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
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
@RequestMapping("/api/plans")
@Tag(name = "Plan", description = "Endpoints for managing Financial Plans")
public class FinancialPlanController {

    @Autowired
    private FinancialPlanService service;
    @Autowired
    private FinancialPlanAssembler assembler;

    @Autowired
    private FinancialPeriodService financialPeriodService;

    @Autowired
    private FinancialPeriodAssembler financialPeriodAssembler;

    @PostMapping
    @ApiPostResponses
    @Operation(summary = "Create a new Financial Plan", tags = {"Plan"})
    public ResponseEntity<EntityModel<FinancialPlanResponseDTO>> create(@RequestBody @Valid FinancialPlanRequestDTO dto) {
        FinancialPlanResponseDTO created = service.create(dto);
        EntityModel<FinancialPlanResponseDTO> model = assembler.toModel(created);

        return ResponseEntity
                .created(model.getRequiredLink(IanaLinkRelations.SELF).toUri())
                .body(model);
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Find a Financial Plan by ID", tags = {"Plan"})
    public EntityModel<FinancialPlanResponseDTO> getById(@PathVariable UUID id) {
        FinancialPlanResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @GetMapping("/{id}/periods")
    @ApiGetResponses
    @Operation(summary = "Find Periods by Financial Plan", tags = {"Plan", "Period"})
    public CollectionModel<EntityModel<FinancialPeriodResponseDTO>> getPeriodsByPlan(@PathVariable UUID id) {
        List<FinancialPeriodResponseDTO> dtoList = financialPeriodService.findAllByPlan(id);

        return financialPeriodAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(FinancialPlanController.class).getPeriodsByPlan(id)).withSelfRel());
    }

    @PutMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update a Financial Plan by ID", tags = {"Plan"})
    public ResponseEntity<EntityModel<FinancialPlanResponseDTO>> update(@PathVariable UUID id, @RequestBody @Validated(onUpdate.class) FinancialPlanRequestDTO dto) {
        FinancialPlanResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @PatchMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update partial a Financial Plan by ID")
    public ResponseEntity<EntityModel<FinancialPlanResponseDTO>> partialUpdate(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        FinancialPlanResponseDTO updated = service.updatePartial(id, updates);
        return ResponseEntity.ok(assembler.toModel(updated));
    }


    @DeleteMapping("/{id}")
    @ApiDeleteResponses
    @Operation(summary = "Delete a Financial Plan by ID")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
