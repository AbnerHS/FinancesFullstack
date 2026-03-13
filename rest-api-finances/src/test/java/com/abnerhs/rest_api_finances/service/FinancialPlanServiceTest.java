package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialSummaryDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.FinancialPlanMapper;
import com.abnerhs.rest_api_finances.model.FinancialPlan;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.FinancialPlanRepository;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import com.abnerhs.rest_api_finances.repository.UserRepository;
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
class FinancialPlanServiceTest {

    @Mock
    private FinancialPlanRepository repository;

    @Mock
    private FinancialPlanMapper mapper;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private FinancialPlanService service;

    @Test
    void shouldCreatePlan() {
        FinancialPlanRequestDTO dto = new FinancialPlanRequestDTO("Plano", UUID.randomUUID(), null);
        FinancialPlan entity = new FinancialPlan();
        FinancialPlan saved = new FinancialPlan();
        FinancialPlanResponseDTO response = new FinancialPlanResponseDTO(UUID.randomUUID(), "Plano", dto.ownerId(), null);

        when(mapper.toEntity(dto)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(saved);
        when(mapper.toDto(saved)).thenReturn(response);

        assertEquals(response, service.create(dto));
    }

    @Test
    void shouldFindAllPlansByUser() {
        UUID userId = UUID.randomUUID();
        List<FinancialPlan> plans = List.of(new FinancialPlan());
        List<FinancialPlanResponseDTO> response = List.of(new FinancialPlanResponseDTO(UUID.randomUUID(), "Plano", userId, null));

        when(repository.findByOwnerIdOrPartnerId(userId, userId)).thenReturn(plans);
        when(mapper.toDtoList(plans)).thenReturn(response);

        assertEquals(response, service.findAllByUser(userId));
    }

    @Test
    void shouldFindPlanById() {
        UUID id = UUID.randomUUID();
        FinancialPlan plan = new FinancialPlan();
        FinancialPlanResponseDTO response = new FinancialPlanResponseDTO(id, "Plano", UUID.randomUUID(), null);

        when(repository.findById(id)).thenReturn(Optional.of(plan));
        when(mapper.toDto(plan)).thenReturn(response);

        assertEquals(response, service.findById(id));
    }

    @Test
    void shouldThrowWhenPlanIsNotFoundById() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.findById(id));
    }

    @Test
    void shouldReturnPlanSummary() {
        UUID planId = UUID.randomUUID();
        FinancialSummaryDTO summary = new FinancialSummaryDTO(
                new BigDecimal("100.00"),
                new BigDecimal("40.00"),
                new BigDecimal("60.00")
        );

        when(repository.existsById(planId)).thenReturn(true);
        when(transactionRepository.getSummaryByPlanId(planId)).thenReturn(summary);

        assertEquals(summary, service.getSummary(planId));
    }

    @Test
    void shouldRejectSummaryWhenPlanDoesNotExist() {
        UUID planId = UUID.randomUUID();
        when(repository.existsById(planId)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.getSummary(planId));
    }

    @Test
    void shouldUpdatePlan() {
        UUID id = UUID.randomUUID();
        FinancialPlanRequestDTO dto = new FinancialPlanRequestDTO("Plano Atualizado", UUID.randomUUID(), null);
        FinancialPlan entity = new FinancialPlan();
        FinancialPlanResponseDTO response = new FinancialPlanResponseDTO(id, "Plano Atualizado", dto.ownerId(), null);

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        assertEquals(response, service.update(id, dto));
        verify(mapper).updateEntityFromDto(dto, entity);
    }

    @Test
    void shouldThrowWhenUpdatingMissingPlan() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.update(id, new FinancialPlanRequestDTO("Plano", UUID.randomUUID(), null)));
    }

    @Test
    void shouldPartiallyUpdatePlanNameAndPartner() {
        UUID id = UUID.randomUUID();
        UUID partnerId = UUID.randomUUID();
        FinancialPlan entity = new FinancialPlan();
        User partner = new User("partner@example.com", "encoded", "Partner");
        partner.setId(partnerId);
        FinancialPlanResponseDTO response = new FinancialPlanResponseDTO(id, "Plano Novo", UUID.randomUUID(), partnerId);

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(userRepository.findById(partnerId)).thenReturn(Optional.of(partner));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        FinancialPlanResponseDTO result = service.updatePartial(id, Map.of(
                "name", "Plano Novo",
                "partnerId", partnerId.toString()
        ));

        assertEquals(response, result);
        assertEquals("Plano Novo", entity.getName());
        assertEquals(partner, entity.getPartner());
    }

    @Test
    void shouldRejectPartialUpdateWhenPartnerDoesNotExist() {
        UUID id = UUID.randomUUID();
        UUID partnerId = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(new FinancialPlan()));
        when(userRepository.findById(partnerId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                service.updatePartial(id, Map.of("partnerId", partnerId.toString())));
    }

    @Test
    void shouldThrowWhenPartialUpdatingMissingPlan() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.updatePartial(id, Map.of("name", "Novo")));
    }

    @Test
    void shouldDeletePlan() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(true);

        service.delete(id);

        verify(repository).deleteById(id);
    }

    @Test
    void shouldRejectDeletingMissingPlan() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.delete(id));
    }
}
