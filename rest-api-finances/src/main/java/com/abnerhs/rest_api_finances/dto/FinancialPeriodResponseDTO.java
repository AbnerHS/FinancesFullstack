package com.abnerhs.rest_api_finances.dto;

import org.springframework.hateoas.RepresentationModel;

import java.math.BigDecimal;
import java.util.UUID;

public class FinancialPeriodResponseDTO extends RepresentationModel<FinancialPeriodResponseDTO> {
    UUID id;
    Integer month;
    Integer year;
    BigDecimal monthlyBalance;
    UUID financialPlanId;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public BigDecimal getMonthlyBalance() {
        return monthlyBalance;
    }

    public void setMonthlyBalance(BigDecimal monthlyBalance) {
        this.monthlyBalance = monthlyBalance;
    }

    public UUID getFinancialPlanId() {
        return financialPlanId;
    }

    public void setFinancialPlanId(UUID financialPlanId) {
        this.financialPlanId = financialPlanId;
    }
}