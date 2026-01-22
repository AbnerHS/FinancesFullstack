package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.projection.FinancialPlanDetailed;
import com.abnerhs.rest_api_finances.projection.FinancialPlanSummary;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/financial-plans")
public class FinancialPlanController {

    @Autowired
    private FinancialPlanService service;

    @PostMapping
    public ResponseEntity<FinancialPlanResponseDTO> create(@RequestBody @Valid FinancialPlanRequestDTO dto){
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<FinancialPlanSummary>> listByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(service.findAllByUser(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FinancialPlanDetailed> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id));
    }
}
