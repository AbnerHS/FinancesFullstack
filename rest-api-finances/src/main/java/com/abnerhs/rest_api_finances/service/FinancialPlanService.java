package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.FinancialPlanMapper;
import com.abnerhs.rest_api_finances.model.FinancialPlan;
import com.abnerhs.rest_api_finances.projection.FinancialPlanDetailed;
import com.abnerhs.rest_api_finances.projection.FinancialPlanSummary;
import com.abnerhs.rest_api_finances.repository.FinancialPlanRepository;
import jakarta.transaction.Transactional;
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

    @Transactional
    public FinancialPlanResponseDTO create(FinancialPlanRequestDTO dto) {
        FinancialPlan entity = mapper.toEntity(dto);
        return mapper.toDto(repository.save(entity));
    }

    public List<FinancialPlanResponseDTO> findAllByUser(UUID userId) {
        List<FinancialPlan> entityList = repository.findByOwnerIdOrPartnerId(userId, userId);
        return mapper.toDtoList(entityList);
    }

    public FinancialPlanResponseDTO findById(UUID id) {
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Plano Financeiro não encontrado"));
    }

    @Transactional
    public FinancialPlanResponseDTO update(UUID id, FinancialPlanRequestDTO dto){
        FinancialPlan entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plano Financeiro não encontrado!"));
        mapper.updateEntityFromDto(dto, entity);
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Plano Financeiro não encontrado para exclusão");
        }
        repository.deleteById(id);
    }
}
