package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.FinancialPeriodAssembler;
import com.abnerhs.rest_api_finances.assembler.FinancialPlanAssembler;
import com.abnerhs.rest_api_finances.assembler.CreditCardAssembler;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.docs.ApiDeleteResponses;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPatchResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.docs.ApiPutResponses;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanInvitationResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanInviteLinkResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanParticipantResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialSummaryDTO;
import com.abnerhs.rest_api_finances.dto.groups.onUpdate;
import com.abnerhs.rest_api_finances.service.FinancialPeriodService;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
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

    @Autowired
    private CreditCardService creditCardService;

    @Autowired
    private CreditCardAssembler creditCardAssembler;

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

    @GetMapping("/{id}/summary")
    @ApiGetResponses
    @Operation(summary = "Get Financial Summary for a Plan", tags = {"Plan"})
    public ResponseEntity<FinancialSummaryDTO> getSummary(@PathVariable UUID id) {
        FinancialSummaryDTO summary = service.getSummary(id);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/{id}/periods")
    @ApiGetResponses
    @Operation(summary = "Find Periods by Financial Plan", tags = {"Plan", "Period"})
    public CollectionModel<EntityModel<FinancialPeriodResponseDTO>> getPeriodsByPlan(@PathVariable UUID id) {
        service.assertCurrentUserCanAccessPlan(id);
        List<FinancialPeriodResponseDTO> dtoList = financialPeriodService.findAllByPlan(id);

        return financialPeriodAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(FinancialPlanController.class).getPeriodsByPlan(id)).withSelfRel());
    }

    @GetMapping("/{id}/credit-cards")
    @ApiGetResponses
    @Operation(summary = "Find credit cards available in a financial plan", tags = {"Plan", "Card"})
    public CollectionModel<EntityModel<CreditCardResponseDTO>> getCreditCardsByPlan(@PathVariable UUID id) {
        List<CreditCardResponseDTO> dtoList = creditCardService.findAllByPlan(id);

        return creditCardAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(FinancialPlanController.class).getCreditCardsByPlan(id)).withSelfRel());
    }

    @GetMapping("/{id}/participants")
    @ApiGetResponses
    @Operation(summary = "Find participants by financial plan", tags = {"Plan"})
    public ResponseEntity<List<FinancialPlanParticipantResponseDTO>> getParticipants(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getParticipants(id));
    }

    @GetMapping("/{id}/invite-link")
    @ApiGetResponses
    @Operation(summary = "Get the active invite link for a plan", tags = {"Plan"})
    public ResponseEntity<FinancialPlanInviteLinkResponseDTO> getInviteLink(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getInviteLink(id));
    }

    @PutMapping("/{id}/invite-link")
    @ApiPutResponses
    @Operation(summary = "Rotate or generate the active invite link for a plan", tags = {"Plan"})
    public ResponseEntity<FinancialPlanInviteLinkResponseDTO> rotateInviteLink(@PathVariable UUID id) {
        return ResponseEntity.ok(service.rotateInviteLink(id));
    }

    @DeleteMapping("/{id}/invite-link")
    @ApiDeleteResponses
    @Operation(summary = "Revoke the active invite link for a plan", tags = {"Plan"})
    public ResponseEntity<Void> revokeInviteLink(@PathVariable UUID id) {
        service.revokeInviteLink(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/invitations/{token}")
    @ApiGetResponses
    @Operation(summary = "Resolve a plan invitation", tags = {"Plan"})
    public ResponseEntity<FinancialPlanInvitationResponseDTO> resolveInvitation(@PathVariable String token) {
        return ResponseEntity.ok(service.resolveInvitation(token));
    }

    @PostMapping("/invitations/{token}/accept")
    @ApiPostResponses
    @Operation(summary = "Accept a plan invitation", tags = {"Plan"})
    public ResponseEntity<FinancialPlanInvitationResponseDTO> acceptInvitation(@PathVariable String token) {
        return ResponseEntity.ok(service.acceptInvitation(token));
    }

    @DeleteMapping("/{id}/participants/{userId}")
    @ApiDeleteResponses
    @Operation(summary = "Remove a partner from a plan", tags = {"Plan"})
    public ResponseEntity<Void> removeParticipant(@PathVariable UUID id, @PathVariable UUID userId) {
        service.removeParticipant(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    @ApiPutResponses
    @Operation(summary = "Update a Financial Plan by ID", tags = {"Plan"})
    public ResponseEntity<EntityModel<FinancialPlanResponseDTO>> update(@PathVariable UUID id, @RequestBody @Validated(onUpdate.class) FinancialPlanRequestDTO dto) {
        FinancialPlanResponseDTO updated = service.update(id, dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @PatchMapping("/{id}")
    @ApiPatchResponses
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
