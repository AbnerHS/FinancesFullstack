package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.CategorySpendingDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private FinancialPeriodRepository periodRepository;

    @InjectMocks
    private ReportService service;

    @Test
    void shouldReturnSpendingByCategory() {
        UUID periodId = UUID.randomUUID();
        List<CategorySpendingDTO> response = List.of(
                new CategorySpendingDTO("CASA", new BigDecimal("80.00")),
                new CategorySpendingDTO("LAZER", new BigDecimal("50.00"))
        );

        when(periodRepository.existsById(periodId)).thenReturn(true);
        when(transactionRepository.getSpendingByCategory(periodId)).thenReturn(response);

        assertEquals(response, service.getSpendingByCategory(periodId));
    }

    @Test
    void shouldRejectReportWhenPeriodDoesNotExist() {
        UUID periodId = UUID.randomUUID();
        when(periodRepository.existsById(periodId)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.getSpendingByCategory(periodId));
    }
}
