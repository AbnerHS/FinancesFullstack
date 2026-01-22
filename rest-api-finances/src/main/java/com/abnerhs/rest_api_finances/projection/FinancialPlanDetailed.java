package com.abnerhs.rest_api_finances.projection;

import com.abnerhs.rest_api_finances.model.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface FinancialPlanDetailed {
    UUID getId();
    String getName();

    FinancialPlanSummary.OwnerSummary getOwner();
    FinancialPlanSummary.PartnerSummary getPartner();

    List<PeriodDetailed> getPeriods();

    interface OwnerSummary {
        UUID getId();
        String getName();
    }

    interface PartnerSummary {
        UUID getId();
        String getName();
    }

    interface PeriodDetailed {
        UUID getId();
        Integer getMonth();
        Integer getYear();
        BigDecimal getMonthlyBalance();

         List<TransactionDetailed> getTransactions();
    }

    interface TransactionDetailed {
        UUID getId();
        String getDescription();
        BigDecimal getAmount();
        TransactionType getType();
        LocalDate getDate();
    }
}
