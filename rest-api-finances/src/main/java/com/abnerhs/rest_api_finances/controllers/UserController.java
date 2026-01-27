package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.assembler.FinancialPlanAssembler;
import com.abnerhs.rest_api_finances.assembler.UserAssembler;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.dto.UserDTO;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
import com.abnerhs.rest_api_finances.service.UserService;
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
public class UserController {

    @Autowired
    private UserService service;
    @Autowired
    private UserAssembler assembler;

    @Autowired
    private FinancialPlanService financialPlanService;
    @Autowired
    private FinancialPlanAssembler financialPlanAssembler;

    @PostMapping
    public ResponseEntity<UserDTO> create(@RequestBody UserDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @GetMapping
    public CollectionModel<EntityModel<UserDTO>> getAll() {
        List<UserDTO> dtoList = service.findAll();
        return assembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(UserController.class).getAll()).withSelfRel());
    }

    @GetMapping("/{id}")
    public EntityModel<UserDTO> getById(@PathVariable UUID id) {
        UserDTO dto = service.findById(id);
        return assembler.toModel(dto);
    }

    @GetMapping("/{id}/plans")
    public CollectionModel<EntityModel<FinancialPlanResponseDTO>> getPlansByUser(@PathVariable UUID id) {
        List<FinancialPlanResponseDTO> dtoList = financialPlanService.findAllByUser(id);
        return financialPlanAssembler.toCollectionModel(dtoList)
                .add(linkTo(methodOn(UserController.class).getPlansByUser(id)).withSelfRel());
    }

}
