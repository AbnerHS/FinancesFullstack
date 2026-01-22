package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.FinancialPlanMapper;
import com.abnerhs.rest_api_finances.model.FinancialPlan;
import com.abnerhs.rest_api_finances.projection.FinancialPlanDetailed;
import com.abnerhs.rest_api_finances.projection.FinancialPlanSummary;
import com.abnerhs.rest_api_finances.repository.FinancialPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class FinancialPlanService {

    @Autowired
    private FinancialPlanRepository repository;

    @Autowired
    private FinancialPlanMapper mapper;

    public FinancialPlanResponseDTO create(FinancialPlanRequestDTO dto) {
        FinancialPlan entity = mapper.toEntity(dto);
        return mapper.toDto(repository.save(entity));
    }

    public List<FinancialPlanSummary> findAllByUser(UUID userId) {
        return repository.findProjectedByOwnerId(userId);
    }

    public FinancialPlanDetailed findById(UUID id) {
        return repository.findProjectedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plano Financeiro não encontrado"));
    }
}
