package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.CreditCardAssembler;
import com.abnerhs.rest_api_finances.assembler.FinancialPlanAssembler;
import com.abnerhs.rest_api_finances.assembler.UserAssembler;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPatchResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.dto.*;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.service.CreditCardService;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
import com.abnerhs.rest_api_finances.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/users")
@Tag(name = "User", description = "Endpoints for managing Users")
public class UserController {

    @Autowired
    private UserService service;
    @Autowired
    private UserAssembler assembler;

    @Autowired
    private FinancialPlanService financialPlanService;
    @Autowired
    private FinancialPlanAssembler financialPlanAssembler;

    @Autowired
    private CreditCardService creditCardService;
    @Autowired
    private CreditCardAssembler creditCardAssembler;

    @PostMapping
    @ApiPostResponses
    @Operation(summary = "Create a new User", tags = {"User"})
    public ResponseEntity<UserResponseDTO> create(@RequestBody @Valid UserRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @GetMapping
    @ApiGetResponses
    @Operation(summary = "Find all Users", tags = {"User"})
    public CollectionModel<EntityModel<UserResponseDTO>> getAll() {
        List<UserResponseDTO> dtoList = service.findAll();
        return assembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(UserController.class).getAll()).withSelfRel());
    }

    @GetMapping("/me")
    @ApiGetResponses
    @Operation(summary = "Find the current User", tags = {"User"})
    public EntityModel<UserResponseDTO> getMe() {
        User currentUser = getCurrentUser();
        UserResponseDTO dto = service.findById(currentUser.getId());
        return assembler.toModel(dto);
    }

    @PatchMapping("/me")
    @ApiPatchResponses
    @Operation(summary = "Update the current User", tags = {"User"})
    public ResponseEntity<EntityModel<UserResponseDTO>> updateMe(@RequestBody @Valid UserUpdateDTO dto) {
        User currentUser = getCurrentUser();
        UserResponseDTO updated = service.update(currentUser.getId(), dto);
        return ResponseEntity.ok(assembler.toModel(updated));
    }

    @PutMapping("/me/password")
    @ApiPatchResponses
    @Operation(summary = "Update the current User's password", tags = {"User"})
    public ResponseEntity<Void> updatePassword(@RequestBody @Valid UserPasswordUpdateDTO dto) {
        User currentUser = getCurrentUser();
        service.updatePassword(currentUser.getId(), dto);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/plans")
    @ApiGetResponses
    @Operation(summary = "Find Financial Plans for the current User", tags = {"User", "Plan"})
    public CollectionModel<EntityModel<FinancialPlanResponseDTO>> getPlansForCurrentUser() {
        User currentUser = getCurrentUser();
        List<FinancialPlanResponseDTO> dtoList = financialPlanService.findAllByUser(currentUser.getId());
        return financialPlanAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(UserController.class).getPlansForCurrentUser()).withSelfRel());
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Find User by ID", tags = {"User"})
    public EntityModel<UserResponseDTO> getById(@PathVariable UUID id) {
        UserResponseDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @GetMapping("/{id}/plans")
    @ApiGetResponses
    @Operation(summary = "Find Financial Plans by User", tags = {"User", "Plan"})
    public CollectionModel<EntityModel<FinancialPlanResponseDTO>> getPlansByUser(@PathVariable UUID id) {
        List<FinancialPlanResponseDTO> dtoList = financialPlanService.findAllByUser(id);
        return financialPlanAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(UserController.class).getPlansByUser(id)).withSelfRel());
    }

    @GetMapping("/{id}/credit-cards")
    @ApiGetResponses
    @Operation(summary = "Find Credit Cards by User", tags = {"User", "Card"})
    public CollectionModel<EntityModel<CreditCardResponseDTO>> getCreditCardsByUser(@PathVariable UUID id) {
        List<CreditCardResponseDTO> dtoList = creditCardService.findAllByUser(id);
        return creditCardAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(UserController.class).getCreditCardsByUser(id)).withSelfRel());
    }

    @GetMapping("/me/credit-cards")
    @ApiGetResponses
    @Operation(summary = "Find Credit Cards for the current user", tags = {"User", "Card"})
    public CollectionModel<EntityModel<CreditCardResponseDTO>> getCreditCardsForCurrentUser() {
        User currentUser = getCurrentUser();
        List<CreditCardResponseDTO> dtoList = creditCardService.findAllByUser(currentUser.getId());
        return creditCardAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(UserController.class).getCreditCardsForCurrentUser()).withSelfRel());
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Usuário não autenticado");
        }
        return (User) authentication.getPrincipal();
    }

}