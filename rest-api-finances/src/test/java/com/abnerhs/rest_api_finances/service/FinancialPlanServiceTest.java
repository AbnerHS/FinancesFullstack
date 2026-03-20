package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.FinancialPlanInvitationResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanInviteLinkResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanParticipantResponseDTO;
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
import com.abnerhs.rest_api_finances.support.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private FinancialPlanService service;

    @Test
    void shouldCreatePlanUsingAuthenticatedOwner() {
        FinancialPlanRequestDTO dto = new FinancialPlanRequestDTO("Plano");
        FinancialPlan entity = new FinancialPlan();
        FinancialPlan saved = new FinancialPlan();
        User currentUser = TestDataFactory.currentUser();
        FinancialPlanResponseDTO response = new FinancialPlanResponseDTO(UUID.randomUUID(), "Plano", currentUser.getId(), List.of());

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(saved);
        when(mapper.toDto(saved)).thenReturn(response);

        assertEquals(response, service.create(dto));
        assertEquals(currentUser, entity.getOwner());
    }

    @Test
    void shouldFindAllPlansByUser() {
        UUID userId = UUID.randomUUID();
        List<FinancialPlan> plans = List.of(new FinancialPlan());
        List<FinancialPlanResponseDTO> response = List.of(new FinancialPlanResponseDTO(UUID.randomUUID(), "Plano", userId, List.of()));

        when(repository.findAllByParticipantId(userId)).thenReturn(plans);
        when(mapper.toDtoList(plans)).thenReturn(response);

        assertEquals(response, service.findAllByUser(userId));
    }

    @Test
    void shouldAllowParticipantToFindPlanById() {
        User currentUser = TestDataFactory.currentUser();
        FinancialPlan plan = ownedPlan(currentUser);
        FinancialPlanResponseDTO response = new FinancialPlanResponseDTO(plan.getId(), plan.getName(), currentUser.getId(), List.of());

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(repository.findById(plan.getId())).thenReturn(Optional.of(plan));
        when(mapper.toDto(plan)).thenReturn(response);

        assertEquals(response, service.findById(plan.getId()));
    }

    @Test
    void shouldRejectPlanAccessWhenUserIsNotParticipant() {
        User currentUser = TestDataFactory.currentUser();
        User owner = new User("owner@example.com", "encoded", "Owner");
        owner.setId(UUID.randomUUID());
        FinancialPlan plan = ownedPlan(owner);

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(repository.findById(plan.getId())).thenReturn(Optional.of(plan));

        assertThrows(AccessDeniedException.class, () -> service.findById(plan.getId()));
    }

    @Test
    void shouldReturnPlanSummaryForParticipant() {
        User currentUser = TestDataFactory.currentUser();
        FinancialPlan plan = ownedPlan(currentUser);
        FinancialSummaryDTO summary = new FinancialSummaryDTO(
                new BigDecimal("100.00"),
                new BigDecimal("40.00"),
                new BigDecimal("60.00")
        );

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(repository.findById(plan.getId())).thenReturn(Optional.of(plan));
        when(transactionRepository.getSummaryByPlanId(plan.getId())).thenReturn(summary);

        assertEquals(summary, service.getSummary(plan.getId()));
    }

    @Test
    void shouldUpdatePlanNameForOwner() {
        User currentUser = TestDataFactory.currentUser();
        UUID id = UUID.randomUUID();
        FinancialPlanRequestDTO dto = new FinancialPlanRequestDTO("Plano Atualizado");
        FinancialPlan entity = ownedPlan(currentUser);
        entity.setId(id);
        FinancialPlanResponseDTO response = new FinancialPlanResponseDTO(id, "Plano Atualizado", currentUser.getId(), List.of());

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        assertEquals(response, service.update(id, dto));
        verify(mapper).updateEntityFromDto(dto, entity);
    }

    @Test
    void shouldRejectUpdateWhenCurrentUserIsNotOwner() {
        User currentUser = TestDataFactory.currentUser();
        User owner = new User("owner@example.com", "encoded", "Owner");
        owner.setId(UUID.randomUUID());
        FinancialPlan entity = ownedPlan(owner);

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

        assertThrows(AccessDeniedException.class, () -> service.update(entity.getId(), new FinancialPlanRequestDTO("Plano")));
    }

    @Test
    void shouldPartiallyUpdatePlanName() {
        User currentUser = TestDataFactory.currentUser();
        FinancialPlan entity = ownedPlan(currentUser);
        FinancialPlanResponseDTO response = new FinancialPlanResponseDTO(entity.getId(), "Plano Novo", currentUser.getId(), List.of());

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        FinancialPlanResponseDTO result = service.updatePartial(entity.getId(), Map.of("name", "Plano Novo"));

        assertEquals(response, result);
        assertEquals("Plano Novo", entity.getName());
    }

    @Test
    void shouldListParticipantsWithOwnerFirst() {
        User owner = TestDataFactory.currentUser();
        User partner = TestDataFactory.partnerUser();
        FinancialPlan entity = ownedPlan(owner);
        entity.addPartner(partner);

        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

        List<FinancialPlanParticipantResponseDTO> participants = service.getParticipants(entity.getId());

        assertEquals(2, participants.size());
        assertEquals("OWNER", participants.get(0).role());
        assertEquals("PARTNER", participants.get(1).role());
    }

    @Test
    void shouldReturnInviteLinkStateForOwner() {
        User owner = TestDataFactory.currentUser();
        FinancialPlan entity = ownedPlan(owner);
        entity.setActiveInviteToken("invite-token");

        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

        FinancialPlanInviteLinkResponseDTO response = service.getInviteLink(entity.getId());

        assertEquals("invite-token", response.inviteToken());
        assertEquals(true, response.active());
    }

    @Test
    void shouldRotateInviteLinkForOwner() {
        User owner = TestDataFactory.currentUser();
        FinancialPlan entity = ownedPlan(owner);

        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(repository.existsByActiveInviteToken(any())).thenReturn(false);

        FinancialPlanInviteLinkResponseDTO response = service.rotateInviteLink(entity.getId());

        assertNotNull(response.inviteToken());
        assertEquals(true, response.active());
    }

    @Test
    void shouldRevokeInviteLinkForOwner() {
        User owner = TestDataFactory.currentUser();
        FinancialPlan entity = ownedPlan(owner);
        entity.setActiveInviteToken("invite-token");

        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);

        service.revokeInviteLink(entity.getId());

        assertNull(entity.getActiveInviteToken());
    }

    @Test
    void shouldResolveInvitationForAuthenticatedUser() {
        User owner = TestDataFactory.currentUser();
        User currentUser = TestDataFactory.partnerUser();
        FinancialPlan entity = ownedPlan(owner);
        entity.setActiveInviteToken("invite-token");

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(repository.findByActiveInviteToken("invite-token")).thenReturn(Optional.of(entity));

        FinancialPlanInvitationResponseDTO response = service.resolveInvitation("invite-token");

        assertFalse(response.alreadyParticipant());
        assertFalse(response.owner());
    }

    @Test
    void shouldAcceptInvitationIdempotently() {
        User owner = TestDataFactory.currentUser();
        User currentUser = TestDataFactory.partnerUser();
        FinancialPlan entity = ownedPlan(owner);
        entity.setActiveInviteToken("invite-token");

        when(currentUserService.getCurrentUser()).thenReturn(currentUser);
        when(repository.findByActiveInviteToken("invite-token")).thenReturn(Optional.of(entity));
        when(userRepository.findById(currentUser.getId())).thenReturn(Optional.of(currentUser));
        when(repository.save(entity)).thenReturn(entity);

        FinancialPlanInvitationResponseDTO response = service.acceptInvitation("invite-token");

        assertEquals(true, response.alreadyParticipant());
        assertEquals(true, entity.hasPartner(currentUser.getId()));

        service.acceptInvitation("invite-token");
        verify(repository, never()).existsByActiveInviteToken("invite-token");
    }

    @Test
    void shouldRemoveParticipantAndRotateToken() {
        User owner = TestDataFactory.currentUser();
        User partner = TestDataFactory.partnerUser();
        FinancialPlan entity = ownedPlan(owner);
        entity.addPartner(partner);
        entity.setActiveInviteToken("old-token");

        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));
        when(repository.existsByActiveInviteToken(any())).thenReturn(false);
        when(repository.save(entity)).thenReturn(entity);

        service.removeParticipant(entity.getId(), partner.getId());

        assertFalse(entity.hasPartner(partner.getId()));
        assertNotNull(entity.getActiveInviteToken());
        assertFalse("old-token".equals(entity.getActiveInviteToken()));
    }

    @Test
    void shouldRejectRemovingOwner() {
        User owner = TestDataFactory.currentUser();
        FinancialPlan entity = ownedPlan(owner);

        when(currentUserService.getCurrentUser()).thenReturn(owner);
        when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

        assertThrows(IllegalArgumentException.class, () -> service.removeParticipant(entity.getId(), owner.getId()));
    }

    @Test
    void shouldThrowWhenPlanIsMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.findById(id));
    }

    private FinancialPlan ownedPlan(User owner) {
        FinancialPlan plan = new FinancialPlan();
        plan.setId(UUID.randomUUID());
        plan.setName("Plano Casa");
        plan.setOwner(owner);
        return plan;
    }
}
