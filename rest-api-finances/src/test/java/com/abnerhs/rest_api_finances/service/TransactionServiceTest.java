package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.RecurringTransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.TransactionMapper;
import com.abnerhs.rest_api_finances.model.CreditCardInvoice;
import com.abnerhs.rest_api_finances.model.FinancialPeriod;
import com.abnerhs.rest_api_finances.model.FinancialPlan;
import com.abnerhs.rest_api_finances.model.Transaction;
import com.abnerhs.rest_api_finances.model.TransactionCategory;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.model.enums.PaymentStatus;
import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import com.abnerhs.rest_api_finances.repository.CreditCardInvoiceRepository;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import com.abnerhs.rest_api_finances.repository.TransactionCategoryRepository;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository repository;

    @Mock
    private TransactionMapper mapper;

    @Mock
    private CreditCardInvoiceRepository invoiceRepository;

    @Mock
    private FinancialPeriodRepository periodRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionCategoryRepository transactionCategoryRepository;

    @Mock
    private FinancialPlanService financialPlanService;

    @InjectMocks
    private TransactionService service;

    @Test
    void shouldCreateTransactionUsingCategoryName() {
        TransactionRequestDTO dto = buildRequest();
        Transaction entity = new Transaction();
        Transaction saved = new Transaction();
        TransactionResponseDTO response = buildResponse();
        UUID periodId = UUID.randomUUID();
        FinancialPeriod period = new FinancialPeriod();
        period.setId(periodId);
        entity.setPeriod(period);
        TransactionCategory category = buildCategory("CASA");

        when(periodRepository.findById(dto.periodId())).thenReturn(Optional.of(period));
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(transactionCategoryRepository.findByNameIgnoreCase("CASA")).thenReturn(Optional.empty());
        when(transactionCategoryRepository.save(any(TransactionCategory.class))).thenReturn(category);
        when(repository.findMaxOrderByPeriodId(periodId)).thenReturn(4);
        when(repository.save(entity)).thenReturn(saved);
        when(mapper.toDto(saved)).thenReturn(response);

        assertEquals(response, service.create(dto));
        assertEquals(5, entity.getOrder());
        assertEquals(category, entity.getTransactionCategory());
    }

    @Test
    void shouldCreateTransactionUsingExistingCategoryId() {
        TransactionCategory category = buildCategory("CASA");
        TransactionRequestDTO dto = buildRequestWithCategoryId(category.getId(), null);
        Transaction entity = new Transaction();
        FinancialPeriod period = new FinancialPeriod();
        period.setId(UUID.randomUUID());
        entity.setPeriod(period);

        when(periodRepository.findById(dto.periodId())).thenReturn(Optional.of(period));
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(transactionCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(repository.findMaxOrderByPeriodId(period.getId())).thenReturn(0);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(buildResponse(category));

        service.create(dto);

        assertEquals(category, entity.getTransactionCategory());
    }

    @Test
    void shouldCreateTransactionWithoutCategoryWhenPayloadHasBlankName() {
        TransactionRequestDTO dto = buildRequest(UUID.randomUUID(), "   ");
        Transaction entity = new Transaction();
        FinancialPeriod period = new FinancialPeriod();
        period.setId(dto.periodId());
        entity.setPeriod(period);

        when(periodRepository.findById(dto.periodId())).thenReturn(Optional.of(period));
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(repository.findMaxOrderByPeriodId(dto.periodId())).thenReturn(1);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(buildResponse(null));

        service.create(dto);

        assertNull(entity.getTransactionCategory());
        assertEquals(2, entity.getOrder());
    }

    @Test
    void shouldCreateTransactionWithoutCategoryWhenPayloadHasNoCategory() {
        TransactionRequestDTO dto = new TransactionRequestDTO(
                "Salario",
                new BigDecimal("1500.00"),
                TransactionType.REVENUE,
                UUID.randomUUID(),
                null,
                null,
                1,
                null,
                null,
                false,
                null,
                null,
                PaymentStatus.PENDING,
                null
        );
        Transaction entity = new Transaction();
        FinancialPeriod period = new FinancialPeriod();
        period.setId(dto.periodId());
        entity.setPeriod(period);

        when(periodRepository.findById(dto.periodId())).thenReturn(Optional.of(period));
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(repository.findMaxOrderByPeriodId(dto.periodId())).thenReturn(0);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(buildResponse(null));

        service.create(dto);

        assertNull(entity.getTransactionCategory());
        assertEquals(1, entity.getOrder());
    }

    @Test
    void shouldRejectCreateWhenCategoryIdDoesNotExist() {
        UUID categoryId = UUID.randomUUID();
        TransactionRequestDTO dto = buildRequestWithCategoryId(categoryId, null);
        Transaction entity = new Transaction();
        FinancialPeriod period = new FinancialPeriod();
        period.setId(UUID.randomUUID());
        entity.setPeriod(period);

        when(periodRepository.findById(dto.periodId())).thenReturn(Optional.of(period));
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(transactionCategoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.create(dto));
    }

    @Test
    void shouldCreateRecurringTransactionsAcrossPeriods() {
        UUID planId = UUID.randomUUID();
        FinancialPlan plan = new FinancialPlan();
        plan.setId(planId);

        FinancialPeriod initialPeriod = new FinancialPeriod();
        initialPeriod.setId(UUID.randomUUID());
        initialPeriod.setMonth(12);
        initialPeriod.setYear(2026);
        initialPeriod.setFinancialPlan(plan);

        FinancialPeriod januaryPeriod = new FinancialPeriod();
        januaryPeriod.setId(UUID.randomUUID());
        januaryPeriod.setMonth(1);
        januaryPeriod.setYear(2027);
        januaryPeriod.setFinancialPlan(plan);

        TransactionCategory category = buildCategory("CASA");
        TransactionRequestDTO dto = buildRequest(initialPeriod.getId());
        RecurringTransactionRequestDTO recurringRequest = new RecurringTransactionRequestDTO(dto, 2);

        when(periodRepository.findById(initialPeriod.getId())).thenReturn(Optional.of(initialPeriod));
        when(periodRepository.findByMonthAndYearAndFinancialPlanId(12, 2026, planId)).thenReturn(Optional.of(initialPeriod));
        when(periodRepository.findByMonthAndYearAndFinancialPlanId(1, 2027, planId)).thenReturn(Optional.empty());
        when(periodRepository.save(any(FinancialPeriod.class))).thenReturn(januaryPeriod);
        when(transactionCategoryRepository.findByNameIgnoreCase("CASA")).thenReturn(Optional.of(category));
        when(repository.findMaxOrderByPeriodId(initialPeriod.getId())).thenReturn(2);
        when(repository.findMaxOrderByPeriodId(januaryPeriod.getId())).thenReturn(0);
        when(mapper.toEntity(dto)).thenReturn(new Transaction(), new Transaction());
        when(repository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mapper.toDto(any(Transaction.class))).thenAnswer(invocation -> toResponse(invocation.getArgument(0)));

        List<TransactionResponseDTO> result = service.createRecurring(recurringRequest);

        assertEquals(2, result.size());
        assertEquals(initialPeriod.getId(), result.getFirst().periodId());
        assertEquals(januaryPeriod.getId(), result.getLast().periodId());
        assertEquals(3, result.getFirst().order());
        assertEquals(1, result.getLast().order());
        assertEquals("CASA", result.getFirst().category().name());
        verify(periodRepository).save(any(FinancialPeriod.class));
        verify(repository, times(2)).save(any(Transaction.class));
    }

    @Test
    void shouldReuseExistingPeriodsWhenCreatingRecurringTransactions() {
        UUID planId = UUID.randomUUID();
        FinancialPlan plan = new FinancialPlan();
        plan.setId(planId);

        FinancialPeriod initialPeriod = new FinancialPeriod();
        initialPeriod.setId(UUID.randomUUID());
        initialPeriod.setMonth(1);
        initialPeriod.setYear(2026);
        initialPeriod.setFinancialPlan(plan);

        FinancialPeriod secondPeriod = new FinancialPeriod();
        secondPeriod.setId(UUID.randomUUID());
        secondPeriod.setMonth(2);
        secondPeriod.setYear(2026);
        secondPeriod.setFinancialPlan(plan);

        TransactionRequestDTO dto = buildRequest(initialPeriod.getId());
        RecurringTransactionRequestDTO recurringRequest = new RecurringTransactionRequestDTO(dto, 2);

        when(periodRepository.findById(initialPeriod.getId())).thenReturn(Optional.of(initialPeriod));
        when(periodRepository.findByMonthAndYearAndFinancialPlanId(1, 2026, planId)).thenReturn(Optional.of(initialPeriod));
        when(periodRepository.findByMonthAndYearAndFinancialPlanId(2, 2026, planId)).thenReturn(Optional.of(secondPeriod));
        when(transactionCategoryRepository.findByNameIgnoreCase("CASA")).thenReturn(Optional.of(buildCategory("CASA")));
        when(repository.findMaxOrderByPeriodId(initialPeriod.getId())).thenReturn(0);
        when(repository.findMaxOrderByPeriodId(secondPeriod.getId())).thenReturn(4);
        when(mapper.toEntity(dto)).thenReturn(new Transaction(), new Transaction());
        when(repository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mapper.toDto(any(Transaction.class))).thenAnswer(invocation -> toResponse(invocation.getArgument(0)));

        List<TransactionResponseDTO> result = service.createRecurring(recurringRequest);

        assertEquals(2, result.size());
        assertEquals(5, result.getLast().order());
        verify(periodRepository, times(0)).save(any(FinancialPeriod.class));
    }

    @Test
    void shouldShiftDueDateAcrossRecurringTransactionsAndKeepPaymentOnlyOnFirstOccurrence() {
        UUID planId = UUID.randomUUID();
        FinancialPlan plan = new FinancialPlan();
        plan.setId(planId);

        FinancialPeriod januaryPeriod = new FinancialPeriod();
        januaryPeriod.setId(UUID.randomUUID());
        januaryPeriod.setMonth(1);
        januaryPeriod.setYear(2026);
        januaryPeriod.setFinancialPlan(plan);

        FinancialPeriod februaryPeriod = new FinancialPeriod();
        februaryPeriod.setId(UUID.randomUUID());
        februaryPeriod.setMonth(2);
        februaryPeriod.setYear(2026);
        februaryPeriod.setFinancialPlan(plan);

        FinancialPeriod marchPeriod = new FinancialPeriod();
        marchPeriod.setId(UUID.randomUUID());
        marchPeriod.setMonth(3);
        marchPeriod.setYear(2026);
        marchPeriod.setFinancialPlan(plan);

        TransactionRequestDTO dto = buildRequest(
                januaryPeriod.getId(),
                "CASA",
                LocalDate.of(2026, 1, 31),
                LocalDate.of(2026, 1, 10),
                PaymentStatus.PAID
        );
        RecurringTransactionRequestDTO recurringRequest = new RecurringTransactionRequestDTO(dto, 3);

        when(periodRepository.findById(januaryPeriod.getId())).thenReturn(Optional.of(januaryPeriod));
        when(periodRepository.findByMonthAndYearAndFinancialPlanId(1, 2026, planId)).thenReturn(Optional.of(januaryPeriod));
        when(periodRepository.findByMonthAndYearAndFinancialPlanId(2, 2026, planId)).thenReturn(Optional.of(februaryPeriod));
        when(periodRepository.findByMonthAndYearAndFinancialPlanId(3, 2026, planId)).thenReturn(Optional.of(marchPeriod));
        when(transactionCategoryRepository.findByNameIgnoreCase("CASA")).thenReturn(Optional.of(buildCategory("CASA")));
        when(repository.findMaxOrderByPeriodId(januaryPeriod.getId())).thenReturn(0);
        when(repository.findMaxOrderByPeriodId(februaryPeriod.getId())).thenReturn(0);
        when(repository.findMaxOrderByPeriodId(marchPeriod.getId())).thenReturn(0);
        when(mapper.toEntity(dto)).thenReturn(
                buildRecurringEntity(LocalDate.of(2026, 1, 31), LocalDate.of(2026, 1, 10), PaymentStatus.PAID),
                buildRecurringEntity(LocalDate.of(2026, 1, 31), LocalDate.of(2026, 1, 10), PaymentStatus.PAID),
                buildRecurringEntity(LocalDate.of(2026, 1, 31), LocalDate.of(2026, 1, 10), PaymentStatus.PAID)
        );
        when(repository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mapper.toDto(any(Transaction.class))).thenAnswer(invocation -> toResponse(invocation.getArgument(0)));

        List<TransactionResponseDTO> result = service.createRecurring(recurringRequest);

        assertEquals(3, result.size());
        assertEquals(LocalDate.of(2026, 1, 31), result.get(0).dueDate());
        assertEquals(LocalDate.of(2026, 2, 28), result.get(1).dueDate());
        assertEquals(LocalDate.of(2026, 3, 31), result.get(2).dueDate());
        assertEquals(LocalDate.of(2026, 1, 10), result.get(0).paymentDate());
        assertNull(result.get(1).paymentDate());
        assertNull(result.get(2).paymentDate());
        assertEquals(PaymentStatus.PAID, result.get(0).paymentStatus());
        assertEquals(PaymentStatus.PENDING, result.get(1).paymentStatus());
        assertEquals(PaymentStatus.PENDING, result.get(2).paymentStatus());
    }

    @Test
    void shouldRejectRecurringCreationWhenInitialPeriodDoesNotExist() {
        UUID periodId = UUID.randomUUID();
        TransactionRequestDTO dto = buildRequest(periodId);
        RecurringTransactionRequestDTO request = new RecurringTransactionRequestDTO(dto, 2);

        when(periodRepository.findById(periodId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.createRecurring(request));
    }

    @Test
    void shouldReturnTransactionsByPeriod() {
        UUID periodId = UUID.randomUUID();
        List<Transaction> transactions = List.of(new Transaction());
        List<TransactionResponseDTO> response = List.of(buildResponse());

        FinancialPeriod period = new FinancialPeriod();
        period.setId(periodId);
        when(periodRepository.findById(periodId)).thenReturn(Optional.of(period));
        when(repository.findByPeriodIdOrderByOrderAsc(periodId)).thenReturn(transactions);
        when(mapper.toDtoList(transactions)).thenReturn(response);

        assertEquals(response, service.findAllByPeriod(periodId));
    }

    @Test
    void shouldFindTransactionById() {
        UUID id = UUID.randomUUID();
        Transaction transaction = new Transaction();
        TransactionResponseDTO response = buildResponse();

        when(repository.findById(id)).thenReturn(Optional.of(transaction));
        when(mapper.toDto(transaction)).thenReturn(response);

        assertEquals(response, service.findById(id));
    }

    @Test
    void shouldThrowWhenTransactionIsNotFoundById() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.findById(id));
    }

    @Test
    void shouldUpdateTransaction() {
        UUID id = UUID.randomUUID();
        TransactionRequestDTO dto = buildRequest();
        Transaction entity = new Transaction();
        TransactionResponseDTO response = buildResponse();
        TransactionCategory category = buildCategory("CASA");

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(transactionCategoryRepository.findByNameIgnoreCase("CASA")).thenReturn(Optional.of(category));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        assertEquals(response, service.update(id, dto));
        verify(mapper).updateEntityFromDto(dto, entity);
        assertEquals(category, entity.getTransactionCategory());
    }

    @Test
    void shouldUpdateTransactionRemovingCategoryWhenPayloadHasNoCategory() {
        UUID id = UUID.randomUUID();
        TransactionRequestDTO dto = new TransactionRequestDTO(
                "Salario",
                new BigDecimal("1500.00"),
                TransactionType.REVENUE,
                UUID.randomUUID(),
                null,
                null,
                1,
                null,
                null,
                false,
                null,
                null,
                PaymentStatus.PENDING,
                null
        );
        Transaction entity = new Transaction();
        entity.setTransactionCategory(buildCategory("CASA"));

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(buildResponse(null));

        service.update(id, dto);

        assertNull(entity.getTransactionCategory());
    }

    @Test
    void shouldThrowWhenUpdatingMissingTransaction() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.update(id, buildRequest()));
    }

    @Test
    void shouldUpdateTransactionPartiallyUsingCategoryObject() {
        UUID transactionId = UUID.randomUUID();
        UUID responsibleUserId = UUID.randomUUID();
        UUID invoiceId = UUID.randomUUID();

        Transaction transaction = new Transaction();
        User user = new User("john@example.com", "encoded", "John");
        user.setId(responsibleUserId);
        CreditCardInvoice invoice = new CreditCardInvoice();
        invoice.setId(invoiceId);
        TransactionCategory category = buildCategory("CASA");
        TransactionResponseDTO response = buildResponse(category);

        when(repository.findById(transactionId)).thenReturn(Optional.of(transaction));
        when(userRepository.findById(responsibleUserId)).thenReturn(Optional.of(user));
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(transactionCategoryRepository.findByNameIgnoreCase("CASA")).thenReturn(Optional.of(category));
        when(repository.save(transaction)).thenReturn(transaction);
        when(mapper.toDto(transaction)).thenReturn(response);

        Map<String, Object> updates = new HashMap<>();
        updates.put("amount", "25.40");
        updates.put("description", "Mercado");
        updates.put("type", "EXPENSE");
        updates.put("category", Map.of("name", "CASA"));
        updates.put("responsibleUserId", responsibleUserId.toString());
        updates.put("order", "3");
        updates.put("creditCardInvoiceId", invoiceId.toString());
        updates.put("isClearedByInvoice", true);
        updates.put("dueDate", "2026-03-20");
        updates.put("paymentDate", "2026-03-18");
        updates.put("paymentStatus", "PAID");

        TransactionResponseDTO result = service.updatePartial(transactionId, updates);

        assertEquals(response, result);
        assertEquals(new BigDecimal("25.40"), transaction.getAmount());
        assertEquals("Mercado", transaction.getDescription());
        assertEquals(TransactionType.EXPENSE, transaction.getType());
        assertEquals(category, transaction.getTransactionCategory());
        assertEquals(user, transaction.getResponsibleUser());
        assertEquals(3, transaction.getOrder());
        assertEquals(invoice, transaction.getCreditCardInvoice());
        assertTrue(transaction.isClearedByInvoice());
        assertEquals(LocalDate.of(2026, 3, 20), transaction.getDueDate());
        assertEquals(LocalDate.of(2026, 3, 18), transaction.getPaymentDate());
        assertEquals(PaymentStatus.PAID, transaction.getPaymentStatus());
    }

    @Test
    void shouldUpdateTransactionPartiallyUsingCategoryId() {
        UUID transactionId = UUID.randomUUID();
        Transaction transaction = new Transaction();
        TransactionCategory category = buildCategory("LAZER");

        when(repository.findById(transactionId)).thenReturn(Optional.of(transaction));
        when(transactionCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(repository.save(transaction)).thenReturn(transaction);
        when(mapper.toDto(transaction)).thenReturn(buildResponse(category));

        service.updatePartial(transactionId, Map.of("category", Map.of("id", category.getId().toString())));

        assertEquals(category, transaction.getTransactionCategory());
    }

    @Test
    void shouldClearCategoryResponsibleUserAndInvoiceWhenPartialUpdateReceivesNull() {
        UUID transactionId = UUID.randomUUID();
        Transaction transaction = new Transaction();
        transaction.setResponsibleUser(new User("john@example.com", "encoded", "John"));
        transaction.setCreditCardInvoice(new CreditCardInvoice());
        transaction.setTransactionCategory(buildCategory("CASA"));
        when(repository.findById(transactionId)).thenReturn(Optional.of(transaction));
        when(repository.save(transaction)).thenReturn(transaction);
        when(mapper.toDto(transaction)).thenReturn(buildResponse());

        Map<String, Object> updates = new HashMap<>();
        updates.put("category", null);
        updates.put("responsibleUserId", null);
        updates.put("creditCardInvoiceId", null);
        updates.put("dueDate", null);
        updates.put("paymentDate", null);

        service.updatePartial(transactionId, updates);

        assertNull(transaction.getTransactionCategory());
        assertNull(transaction.getResponsibleUser());
        assertNull(transaction.getCreditCardInvoice());
        assertNull(transaction.getDueDate());
        assertNull(transaction.getPaymentDate());
    }

    @Test
    void shouldRejectPartialUpdateWhenCategoryIdDoesNotExist() {
        UUID transactionId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        when(repository.findById(transactionId)).thenReturn(Optional.of(new Transaction()));
        when(transactionCategoryRepository.findById(categoryId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                service.updatePartial(transactionId, Map.of("category", Map.of("id", categoryId.toString()))));
    }

    @Test
    void shouldRejectPartialUpdateWhenCategoryPayloadIsInvalid() {
        UUID transactionId = UUID.randomUUID();
        when(repository.findById(transactionId)).thenReturn(Optional.of(new Transaction()));

        assertThrows(IllegalArgumentException.class, () ->
                service.updatePartial(transactionId, Map.of("category", "CASA")));
    }

    @Test
    void shouldAllowPartialUpdateToClearOrder() {
        UUID transactionId = UUID.randomUUID();
        Transaction transaction = new Transaction();
        transaction.setOrder(3);
        Map<String, Object> updates = new HashMap<>();
        updates.put("order", null);

        when(repository.findById(transactionId)).thenReturn(Optional.of(transaction));
        when(repository.save(transaction)).thenReturn(transaction);
        when(mapper.toDto(transaction)).thenReturn(buildResponse());

        service.updatePartial(transactionId, updates);

        assertNull(transaction.getOrder());
    }

    @Test
    void shouldIgnoreUnknownFieldsOnPartialUpdate() {
        UUID transactionId = UUID.randomUUID();
        Transaction transaction = new Transaction();
        transaction.setDescription("Original");

        when(repository.findById(transactionId)).thenReturn(Optional.of(transaction));
        when(repository.save(transaction)).thenReturn(transaction);
        when(mapper.toDto(transaction)).thenReturn(buildResponse());

        service.updatePartial(transactionId, Map.of("ignored", "value"));

        assertEquals("Original", transaction.getDescription());
    }

    @Test
    void shouldRejectPartialUpdateWhenResponsibleUserDoesNotExist() {
        UUID transactionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(repository.findById(transactionId)).thenReturn(Optional.of(new Transaction()));
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                service.updatePartial(transactionId, Map.of("responsibleUserId", userId.toString())));
    }

    @Test
    void shouldRejectPartialUpdateWhenInvoiceDoesNotExist() {
        UUID transactionId = UUID.randomUUID();
        UUID invoiceId = UUID.randomUUID();
        when(repository.findById(transactionId)).thenReturn(Optional.of(new Transaction()));
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                service.updatePartial(transactionId, Map.of("creditCardInvoiceId", invoiceId.toString())));
    }

    @Test
    void shouldThrowWhenPartialUpdatingMissingTransaction() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.updatePartial(id, Map.of("description", "Nova")));
    }

    @Test
    void shouldDeleteTransaction() {
        UUID id = UUID.randomUUID();
        Transaction transaction = new Transaction();
        when(repository.findById(id)).thenReturn(Optional.of(transaction));

        service.delete(id);

        verify(repository).delete(transaction);
    }

    @Test
    void shouldRejectDeletingMissingTransaction() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.delete(id));
    }

    private TransactionCategory buildCategory(String name) {
        TransactionCategory category = new TransactionCategory(name);
        category.setId(UUID.randomUUID());
        return category;
    }

    private TransactionRequestDTO buildRequest() {
        return buildRequest(UUID.randomUUID());
    }

    private TransactionRequestDTO buildRequest(UUID periodId) {
        return buildRequest(periodId, "CASA");
    }

    private TransactionRequestDTO buildRequest(
            UUID periodId,
            String categoryName,
            LocalDate dueDate,
            LocalDate paymentDate,
            PaymentStatus paymentStatus
    ) {
        return new TransactionRequestDTO(
                "Salario",
                new BigDecimal("1500.00"),
                TransactionType.REVENUE,
                periodId,
                null,
                new TransactionCategoryDTO(null, categoryName),
                1,
                null,
                null,
                false,
                dueDate,
                paymentDate,
                paymentStatus,
                null
        );
    }

    private TransactionRequestDTO buildRequestWithCategoryId(UUID categoryId, String categoryName) {
        return new TransactionRequestDTO(
                "Salario",
                new BigDecimal("1500.00"),
                TransactionType.REVENUE,
                UUID.randomUUID(),
                null,
                new TransactionCategoryDTO(categoryId, categoryName),
                1,
                null,
                null,
                false,
                LocalDate.of(2026, 3, 20),
                LocalDate.of(2026, 3, 18),
                PaymentStatus.PAID,
                null
        );
    }

    private TransactionRequestDTO buildRequest(UUID periodId, String categoryName) {
        return buildRequest(
                periodId,
                categoryName,
                LocalDate.of(2026, 3, 20),
                LocalDate.of(2026, 3, 18),
                PaymentStatus.PAID
        );
    }

    private TransactionResponseDTO buildResponse() {
        return buildResponse(buildCategory("CASA"));
    }

    private TransactionResponseDTO buildResponse(TransactionCategory category) {
        return new TransactionResponseDTO(
                UUID.randomUUID(),
                "Salario",
                new BigDecimal("1500.00"),
                null,
                TransactionType.REVENUE,
                category == null ? null : new TransactionCategoryDTO(category.getId(), category.getName()),
                UUID.randomUUID(),
                null,
                1,
                null,
                null,
                false,
                LocalDate.of(2026, 3, 20),
                LocalDate.of(2026, 3, 18),
                PaymentStatus.PAID,
                null
        );
    }

    private TransactionResponseDTO toResponse(Transaction transaction) {
        TransactionCategory category = transaction.getTransactionCategory();
        return new TransactionResponseDTO(
                UUID.randomUUID(),
                transaction.getDescription(),
                transaction.getAmount(),
                transaction.getDateTime(),
                transaction.getType(),
                category == null ? null : new TransactionCategoryDTO(category.getId(), category.getName()),
                transaction.getPeriod().getId(),
                transaction.getResponsibleUser() != null ? transaction.getResponsibleUser().getId() : null,
                transaction.getOrder(),
                transaction.getRecurringGroupId(),
                transaction.getCreditCardInvoice() != null ? transaction.getCreditCardInvoice().getId() : null,
                transaction.isClearedByInvoice(),
                transaction.getDueDate(),
                transaction.getPaymentDate(),
                transaction.getPaymentStatus(),
                null
        );
    }

    private Transaction buildRecurringEntity(LocalDate dueDate, LocalDate paymentDate, PaymentStatus paymentStatus) {
        Transaction transaction = new Transaction();
        transaction.setDueDate(dueDate);
        transaction.setPaymentDate(paymentDate);
        transaction.setPaymentStatus(paymentStatus);
        return transaction;
    }
}
