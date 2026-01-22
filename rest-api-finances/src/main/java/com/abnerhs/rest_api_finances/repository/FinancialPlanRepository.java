package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.FinancialPlan;
import com.abnerhs.rest_api_finances.projection.FinancialPlanDetailed;
import com.abnerhs.rest_api_finances.projection.FinancialPlanSummary;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialPlanRepository extends JpaRepository<FinancialPlan, UUID> {

    List<FinancialPlan> findByOwnerIdOrPartnerId(UUID ownerId, UUID partnerId);

    @EntityGraph(attributePaths = {"periods", "owner"})
    List<FinancialPlanSummary> findProjectedByOwnerId(UUID ownerId);

    @Query("SELECT p FROM FinancialPlan p WHERE p.id = :id")
    Optional<FinancialPlanDetailed> findProjectedById(UUID id);
}
