package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.CategorySpendingDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ReportService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private FinancialPeriodRepository periodRepository;

    public List<CategorySpendingDTO> getSpendingByCategory(UUID periodId) {
        if (!periodRepository.existsById(periodId)) {
            throw new ResourceNotFoundException("Período não encontrado!");
        }
        return transactionRepository.getSpendingByCategory(periodId);
    }
}