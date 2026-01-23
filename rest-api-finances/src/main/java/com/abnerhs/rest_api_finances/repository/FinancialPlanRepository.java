package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.FinancialPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FinancialPlanRepository extends JpaRepository<FinancialPlan, UUID> {

    List<FinancialPlan> findByOwnerIdOrPartnerId(UUID ownerId, UUID partnerId);
}
