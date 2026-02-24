package com.abnerhs.rest_api_finances.controllers;

import com.abnerhs.rest_api_finances.docs.ApiGetResponses;
import com.abnerhs.rest_api_finances.dto.CategorySpendingDTO;
import com.abnerhs.rest_api_finances.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Report", description = "Endpoints for financial reports")
public class ReportController {

    @Autowired
    private ReportService service;

    @GetMapping("/spending-by-category")
    @ApiGetResponses
    @Operation(summary = "Get spending by category for a given period", tags = {"Report"})
    public ResponseEntity<List<CategorySpendingDTO>> getSpendingByCategory(@RequestParam UUID periodId) {
        List<CategorySpendingDTO> spendingList = service.getSpendingByCategory(periodId);
        return ResponseEntity.ok(spendingList);
    }
}