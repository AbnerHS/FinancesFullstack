package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.CreditCardAssembler;
import com.abnerhs.rest_api_finances.assembler.FinancialPlanAssembler;
import com.abnerhs.rest_api_finances.assembler.UserAssembler;
import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.docs.ApiPostResponses;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.dto.UserDTO;
import com.abnerhs.rest_api_finances.service.CreditCardService;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
import com.abnerhs.rest_api_finances.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<UserDTO> create(@RequestBody UserDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @GetMapping
    @ApiGetResponses
    @Operation(summary = "Find all Users", tags = {"User"})
    public CollectionModel<EntityModel<UserDTO>> getAll() {
        List<UserDTO> dtoList = service.findAll();
        return assembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(UserController.class).getAll()).withSelfRel());
    }

    @GetMapping("/{id}")
    @ApiGetResponses
    @Operation(summary = "Find User by ID", tags = {"User"})
    public EntityModel<UserDTO> getById(@PathVariable UUID id) {
        UserDTO dto = service.findById(id);
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

}
