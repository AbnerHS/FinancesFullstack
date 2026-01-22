package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.FinancialPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FinancialPeriodRepository extends JpaRepository<FinancialPeriod, UUID> {

    List<FinancialPeriod> findByFinancialPlanId(UUID planId);

    // Verifica se já existe o mês/ano para o plano específico
    boolean existsByMonthAndYearAndFinancialPlanId(Integer month, Integer year, UUID planId);
}
