package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.dto.CategorySpendingDTO;
import com.abnerhs.rest_api_finances.dto.FinancialSummaryDTO;
import com.abnerhs.rest_api_finances.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByPeriodIdOrderByOrderAsc(UUID periodId);

    @Query("SELECT COALESCE(MAX(t.order), 0) FROM Transaction t WHERE t.period.id = :periodId")
    Integer findMaxOrderByPeriodId(UUID periodId);

    List<Transaction> findByRecurringGroupId(UUID recurringGroupId);

    long countByBillingDocumentStorageKey(String billingDocumentStorageKey);

    Optional<Transaction> findFirstByRecurringGroupId(UUID recurringGroupId);

    @Query("SELECT new com.abnerhs.rest_api_finances.dto.FinancialSummaryDTO(" +
           "COALESCE(SUM(CASE WHEN t.type = 'REVENUE' THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'REVENUE' THEN t.amount ELSE -t.amount END), 0)) " +
           "FROM Transaction t WHERE t.period.id = :periodId")
    FinancialSummaryDTO getSummaryByPeriodId(UUID periodId);

    @Query("SELECT new com.abnerhs.rest_api_finances.dto.FinancialSummaryDTO(" +
           "COALESCE(SUM(CASE WHEN t.type = 'REVENUE' THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0), " +
           "COALESCE(SUM(CASE WHEN t.type = 'REVENUE' THEN t.amount ELSE -t.amount END), 0)) " +
           "FROM Transaction t WHERE t.period.financialPlan.id = :planId")
    FinancialSummaryDTO getSummaryByPlanId(UUID planId);

    @Query("SELECT new com.abnerhs.rest_api_finances.dto.CategorySpendingDTO(c.name, SUM(t.amount)) " +
           "FROM Transaction t LEFT JOIN t.transactionCategory c " +
           "WHERE t.period.id = :periodId AND t.type = 'EXPENSE' " +
           "GROUP BY c.name")
    List<CategorySpendingDTO> getSpendingByCategory(UUID periodId);
}
