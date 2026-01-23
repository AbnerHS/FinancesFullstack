package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.FinancialPeriodAssembler;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.model.FinancialPeriod;
import com.abnerhs.rest_api_finances.service.FinancialPeriodService;
import jakarta.validation.Valid;
import org.apache.coyote.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.IanaLinkRelations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/financial-periods")
public class FinancialPeriodController {

    @Autowired
    private FinancialPeriodService service;

    @Autowired
    private FinancialPeriodAssembler assembler;

    @PostMapping
    public ResponseEntity<EntityModel<FinancialPeriodResponseDTO>> create(@RequestBody @Valid FinancialPeriodRequestDTO dto) {
        FinancialPeriodResponseDTO created = service.create(dto);
        EntityModel<FinancialPeriodResponseDTO> model = assembler.toModel(created);

        return ResponseEntity
                .created(model.getRequiredLink(IanaLinkRelations.SELF).toUri())
                .body(model);
    }

    @GetMapping("/plan/{planId}")
    public CollectionModel<EntityModel<FinancialPeriodResponseDTO>> getAllByPlanId(@PathVariable UUID planId) {
        List<FinancialPeriodResponseDTO> dtoList = service.findAllByPlan(planId);

        return assembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(FinancialPeriodController.class).getAllByPlanId(planId)).withSelfRel());
    }

    @GetMapping("/{id}")
    public EntityModel<FinancialPeriodResponseDTO> getById(@PathVariable UUID id) {
        FinancialPeriodResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EntityModel<FinancialPeriodResponseDTO>> update(@PathVariable UUID id, @RequestBody FinancialPeriodRequestDTO dto){
        FinancialPeriodResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

}
