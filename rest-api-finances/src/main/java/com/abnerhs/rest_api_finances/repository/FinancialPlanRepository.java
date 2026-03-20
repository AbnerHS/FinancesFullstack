package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.FinancialPlan;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialPlanRepository extends JpaRepository<FinancialPlan, UUID> {

    @EntityGraph(attributePaths = {"owner", "partners"})
    @Query("""
            SELECT DISTINCT plan
            FROM FinancialPlan plan
            LEFT JOIN plan.partners partner
            WHERE plan.owner.id = :userId OR partner.id = :userId
            """)
    List<FinancialPlan> findAllByParticipantId(UUID userId);

    @Override
    @EntityGraph(attributePaths = {"owner", "partners"})
    Optional<FinancialPlan> findById(UUID id);

    @EntityGraph(attributePaths = {"owner", "partners"})
    Optional<FinancialPlan> findByActiveInviteToken(String activeInviteToken);

    boolean existsByActiveInviteToken(String activeInviteToken);
}
