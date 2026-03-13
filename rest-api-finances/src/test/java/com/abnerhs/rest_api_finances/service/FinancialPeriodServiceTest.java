package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.FinancialPeriodRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialSummaryDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.FinancialPeriodMapper;
import com.abnerhs.rest_api_finances.model.FinancialPeriod;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinancialPeriodServiceTest {

    @Mock
    private FinancialPeriodRepository repository;

    @Mock
    private FinancialPeriodMapper mapper;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private FinancialPeriodService service;

    @Test
    void shouldCreatePeriodWithZeroBalanceWhenMapperReturnsNullBalance() {
        FinancialPeriodRequestDTO dto = new FinancialPeriodRequestDTO(3, 2026, UUID.randomUUID());
        FinancialPeriod entity = new FinancialPeriod();
        FinancialPeriod saved = new FinancialPeriod();
        saved.setMonthlyBalance(BigDecimal.ZERO);
        FinancialPeriodResponseDTO response = new FinancialPeriodResponseDTO(UUID.randomUUID(), 3, 2026, BigDecimal.ZERO, dto.financialPlanId());

        when(repository.existsByMonthAndYearAndFinancialPlanId(dto.month(), dto.year(), dto.financialPlanId())).thenReturn(false);
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(saved);
        when(mapper.toDto(saved)).thenReturn(response);

        assertEquals(response, service.create(dto));
        assertEquals(BigDecimal.ZERO, entity.getMonthlyBalance());
    }

    @Test
    void shouldRejectDuplicatedPeriod() {
        FinancialPeriodRequestDTO dto = new FinancialPeriodRequestDTO(3, 2026, UUID.randomUUID());
        when(repository.existsByMonthAndYearAndFinancialPlanId(dto.month(), dto.year(), dto.financialPlanId())).thenReturn(true);

        assertThrows(RuntimeException.class, () -> service.create(dto));
    }

    @Test
    void shouldFindAllPeriodsByPlan() {
        UUID planId = UUID.randomUUID();
        List<FinancialPeriod> periods = List.of(new FinancialPeriod());
        List<FinancialPeriodResponseDTO> response = List.of(new FinancialPeriodResponseDTO(UUID.randomUUID(), 1, 2026, BigDecimal.ZERO, planId));

        when(repository.findByFinancialPlanIdOrderByYearAscMonthAsc(planId)).thenReturn(periods);
        when(mapper.toDtoList(periods)).thenReturn(response);

        assertEquals(response, service.findAllByPlan(planId));
    }

    @Test
    void shouldFindPeriodById() {
        UUID id = UUID.randomUUID();
        FinancialPeriod period = new FinancialPeriod();
        FinancialPeriodResponseDTO response = new FinancialPeriodResponseDTO(id, 1, 2026, BigDecimal.ZERO, UUID.randomUUID());

        when(repository.findById(id)).thenReturn(Optional.of(period));
        when(mapper.toDto(period)).thenReturn(response);

        assertEquals(response, service.findById(id));
    }

    @Test
    void shouldThrowWhenPeriodIsNotFoundById() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.findById(id));
    }

    @Test
    void shouldReturnPeriodSummary() {
        UUID periodId = UUID.randomUUID();
        FinancialSummaryDTO summary = new FinancialSummaryDTO(
                new BigDecimal("300.00"),
                new BigDecimal("100.00"),
                new BigDecimal("200.00")
        );

        when(repository.existsById(periodId)).thenReturn(true);
        when(transactionRepository.getSummaryByPeriodId(periodId)).thenReturn(summary);

        assertEquals(summary, service.getSummary(periodId));
    }

    @Test
    void shouldRejectSummaryWhenPeriodDoesNotExist() {
        UUID periodId = UUID.randomUUID();
        when(repository.existsById(periodId)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.getSummary(periodId));
    }

    @Test
    void shouldUpdatePeriod() {
        UUID id = UUID.randomUUID();
        FinancialPeriodRequestDTO dto = new FinancialPeriodRequestDTO(5, 2027, UUID.randomUUID());
        FinancialPeriod entity = new FinancialPeriod();
        FinancialPeriodResponseDTO response = new FinancialPeriodResponseDTO(id, 5, 2027, BigDecimal.TEN, dto.financialPlanId());

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        assertEquals(response, service.update(id, dto));
        verify(mapper).updateEntityFromDto(dto, entity);
    }

    @Test
    void shouldThrowWhenUpdatingMissingPeriod() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.update(id, new FinancialPeriodRequestDTO(1, 2026, UUID.randomUUID())));
    }

    @Test
    void shouldPartiallyUpdatePeriod() {
        UUID id = UUID.randomUUID();
        FinancialPeriod entity = new FinancialPeriod();
        FinancialPeriodResponseDTO response = new FinancialPeriodResponseDTO(id, 8, 2028, new BigDecimal("450.90"), UUID.randomUUID());

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        FinancialPeriodResponseDTO result = service.updatePartial(id, Map.of(
                "month", 8,
                "year", 2028,
                "monthlyBalance", "450.90"
        ));

        assertEquals(response, result);
        assertEquals(8, entity.getMonth());
        assertEquals(2028, entity.getYear());
        assertEquals(new BigDecimal("450.90"), entity.getMonthlyBalance());
    }

    @Test
    void shouldThrowWhenPartialUpdatingMissingPeriod() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.updatePartial(id, Map.of("month", 4)));
    }

    @Test
    void shouldDeletePeriod() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(true);

        service.delete(id);

        verify(repository).deleteById(id);
    }

    @Test
    void shouldRejectDeletingMissingPeriod() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.delete(id));
    }
}
