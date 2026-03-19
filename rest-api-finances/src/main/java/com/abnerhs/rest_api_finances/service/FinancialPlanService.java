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
import com.abnerhs.rest_api_finances.model.PlanParticipantRole;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.FinancialPlanRepository;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FinancialPlanService {

    @Autowired
    private FinancialPlanRepository repository;

    @Autowired
    private FinancialPlanMapper mapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @Transactional
    public FinancialPlanResponseDTO create(FinancialPlanRequestDTO dto) {
        User currentUser = currentUserService.getCurrentUser();
        FinancialPlan entity = mapper.toEntity(dto);
        entity.setOwner(currentUser);
        return mapper.toDto(repository.save(entity));
    }

    public List<FinancialPlanResponseDTO> findAllByUser(UUID userId) {
        return mapper.toDtoList(repository.findAllByParticipantId(userId));
    }

    public FinancialPlanResponseDTO findById(UUID id) {
        FinancialPlan plan = getAccessiblePlan(id);
        return mapper.toDto(plan);
    }

    public FinancialSummaryDTO getSummary(UUID planId) {
        FinancialPlan plan = getAccessiblePlan(planId);
        return transactionRepository.getSummaryByPlanId(plan.getId());
    }

    public void assertCurrentUserCanAccessPlan(UUID id) {
        getAccessiblePlan(id);
    }

    @Transactional
    public FinancialPlanResponseDTO update(UUID id, FinancialPlanRequestDTO dto) {
        FinancialPlan entity = getOwnedPlan(id);
        mapper.updateEntityFromDto(dto, entity);
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public FinancialPlanResponseDTO updatePartial(UUID id, Map<String, Object> updates) {
        FinancialPlan entity = getOwnedPlan(id);

        updates.forEach((key, value) -> {
            if ("name".equals(key) && value != null) {
                String name = value.toString().trim();
                if (name.isBlank()) {
                    throw new IllegalArgumentException("O nome do plano é obrigatório.");
                }
                entity.setName(name);
            }
        });

        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public void delete(UUID id) {
        FinancialPlan entity = getOwnedPlan(id);
        repository.delete(entity);
    }

    public List<FinancialPlanParticipantResponseDTO> getParticipants(UUID id) {
        FinancialPlan plan = getAccessiblePlan(id);
        List<FinancialPlanParticipantResponseDTO> participants = new ArrayList<>();
        participants.add(toParticipant(plan.getOwner(), PlanParticipantRole.OWNER));
        plan.getPartners().stream()
                .map(user -> toParticipant(user, PlanParticipantRole.PARTNER))
                .forEach(participants::add);
        return participants;
    }

    public FinancialPlanInviteLinkResponseDTO getInviteLink(UUID id) {
        return toInviteLinkResponse(getOwnedPlan(id));
    }

    @Transactional
    public FinancialPlanInviteLinkResponseDTO rotateInviteLink(UUID id) {
        FinancialPlan plan = getOwnedPlan(id);
        plan.setActiveInviteToken(generateInviteToken());
        return toInviteLinkResponse(repository.save(plan));
    }

    @Transactional
    public void revokeInviteLink(UUID id) {
        FinancialPlan plan = getOwnedPlan(id);
        plan.setActiveInviteToken(null);
        repository.save(plan);
    }

    public FinancialPlanInvitationResponseDTO resolveInvitation(String token) {
        FinancialPlan plan = findByInviteToken(token);
        User currentUser = currentUserService.getCurrentUser();
        return toInvitationResponse(plan, currentUser);
    }

    @Transactional
    public FinancialPlanInvitationResponseDTO acceptInvitation(String token) {
        FinancialPlan plan = findByInviteToken(token);
        User currentUser = currentUserService.getCurrentUser();

        if (!plan.isOwner(currentUser.getId()) && !plan.hasPartner(currentUser.getId())) {
            User managedUser = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
            plan.addPartner(managedUser);
            repository.save(plan);
        }

        return toInvitationResponse(plan, currentUser);
    }

    @Transactional
    public void removeParticipant(UUID planId, UUID userId) {
        FinancialPlan plan = getOwnedPlan(planId);
        if (plan.isOwner(userId)) {
            throw new IllegalArgumentException("O owner não pode ser removido do plano.");
        }

        if (!plan.removePartner(userId)) {
            throw new ResourceNotFoundException("Parceiro não encontrado no plano.");
        }

        plan.setActiveInviteToken(generateInviteToken());
        repository.save(plan);
    }

    public boolean planHasParticipant(FinancialPlan plan, UUID userId) {
        return plan != null && userId != null && plan.hasParticipant(userId);
    }

    private FinancialPlan getOwnedPlan(UUID id) {
        FinancialPlan plan = getPlanOrThrow(id);
        User currentUser = currentUserService.getCurrentUser();
        if (!plan.isOwner(currentUser.getId())) {
            throw new AccessDeniedException("Apenas o owner do plano pode realizar esta ação.");
        }
        return plan;
    }

    private FinancialPlan getAccessiblePlan(UUID id) {
        FinancialPlan plan = getPlanOrThrow(id);
        User currentUser = currentUserService.getCurrentUser();
        if (!plan.hasParticipant(currentUser.getId())) {
            throw new AccessDeniedException("Você não participa deste plano.");
        }
        return plan;
    }

    private FinancialPlan getPlanOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plano financeiro não encontrado."));
    }

    private FinancialPlan findByInviteToken(String token) {
        if (token == null || token.isBlank()) {
            throw new ResourceNotFoundException("Convite não encontrado.");
        }

        return repository.findByActiveInviteToken(token.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Convite não encontrado."));
    }

    private FinancialPlanParticipantResponseDTO toParticipant(User user, PlanParticipantRole role) {
        return new FinancialPlanParticipantResponseDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                role.name()
        );
    }

    private FinancialPlanInviteLinkResponseDTO toInviteLinkResponse(FinancialPlan plan) {
        boolean active = plan.getActiveInviteToken() != null && !plan.getActiveInviteToken().isBlank();
        return new FinancialPlanInviteLinkResponseDTO(
                plan.getId(),
                plan.getName(),
                active ? plan.getActiveInviteToken() : null,
                active
        );
    }

    private FinancialPlanInvitationResponseDTO toInvitationResponse(FinancialPlan plan, User currentUser) {
        boolean owner = plan.isOwner(currentUser.getId());
        return new FinancialPlanInvitationResponseDTO(
                plan.getId(),
                plan.getName(),
                plan.getOwner().getId(),
                plan.getOwner().getName(),
                plan.getOwner().getEmail(),
                owner || plan.hasPartner(currentUser.getId()),
                owner
        );
    }

    private String generateInviteToken() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String token = UUID.randomUUID().toString().replace("-", "");
            if (!repository.existsByActiveInviteToken(token)) {
                return token;
            }
        }

        throw new IllegalStateException("Não foi possível gerar um novo link de convite.");
    }
}
