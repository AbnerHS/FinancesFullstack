package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.dto.FinancialPeriodRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.service.FinancialPeriodService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/financial-periods")
public class FinancialPeriodController {

    @Autowired
    private FinancialPeriodService service;

    @PostMapping
    public ResponseEntity<FinancialPeriodResponseDTO> create(@RequestBody @Valid FinancialPeriodRequestDTO dto){
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @GetMapping("/plan/{planId}")
    public ResponseEntity<List<FinancialPeriodResponseDTO>> listByPlan(@PathVariable UUID planId){
        return ResponseEntity.ok(service.findAllByPlan(planId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FinancialPeriodResponseDTO> findById(@PathVariable UUID id){
        return ResponseEntity.ok(service.findById(id));
    }
}
