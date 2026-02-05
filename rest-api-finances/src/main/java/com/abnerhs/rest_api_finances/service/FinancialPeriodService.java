package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.FinancialPeriodRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.FinancialPeriodMapper;
import com.abnerhs.rest_api_finances.model.FinancialPeriod;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class FinancialPeriodService {

    @Autowired
    private FinancialPeriodRepository repository;

    @Autowired
    private FinancialPeriodMapper mapper;

    @Transactional
    public FinancialPeriodResponseDTO create(FinancialPeriodRequestDTO dto) {
        if (repository.existsByMonthAndYearAndFinancialPlanId(dto.month(), dto.year(), dto.financialPlanId())) {
            throw new RuntimeException("Este período (mês/ano) já está cadastrado para este plano.");
        }

        FinancialPeriod entity = mapper.toEntity(dto);
        // Saldo inicial costuma ser zero ou calculado posteriormente
        if (entity.getMonthlyBalance() == null) {
            entity.setMonthlyBalance(BigDecimal.ZERO);
        }

        return mapper.toDto(repository.save(entity));
    }

    public List<FinancialPeriodResponseDTO> findAllByPlan(UUID planId) {
        return mapper.toDtoList(repository.findByFinancialPlanId(planId));
    }

    public FinancialPeriodResponseDTO findById(UUID id){
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Período não encontrado!"));
    }

    @Transactional
    public FinancialPeriodResponseDTO update(UUID id, FinancialPeriodRequestDTO dto) {
        FinancialPeriod entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Período não encontrado!"));
        mapper.updateEntityFromDto(dto, entity);
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public FinancialPeriodResponseDTO updatePartial(UUID id, java.util.Map<String, Object> updates) {
        FinancialPeriod entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Período não encontrado!"));
        updates.forEach((key, value) -> {
            switch (key) {
                case "month" -> entity.setMonth((Integer) value);
                case "year" -> entity.setYear((Integer) value);
                case "monthlyBalance" -> entity.setMonthlyBalance(new BigDecimal(value.toString()));
            }
        });
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Período não encontrado para exclusão");
        }
        repository.deleteById(id);
    }
}
