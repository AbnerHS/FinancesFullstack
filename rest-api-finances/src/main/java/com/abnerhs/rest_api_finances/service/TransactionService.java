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
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository repository;

    @Autowired
    private TransactionMapper mapper;

    @Autowired
    private CreditCardInvoiceRepository invoiceRepository;

    @Autowired
    private FinancialPeriodRepository periodRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionCategoryRepository transactionCategoryRepository;

    @Autowired
    private FinancialPlanService financialPlanService;

    @Transactional
    public TransactionResponseDTO create(TransactionRequestDTO dto) {
        Transaction transaction = mapper.toEntity(dto);
        validateResponsibleUser(transaction);
        transaction.setTransactionCategory(resolveCategory(dto.category()));
        transaction.setOrder(getNextOrder(transaction.getPeriod().getId()));
        return mapper.toDto(repository.save(transaction));
    }

    @Transactional
    public List<TransactionResponseDTO> createRecurring(RecurringTransactionRequestDTO recurringDto) {
        TransactionRequestDTO dto = recurringDto.transaction();
        int numberOfPeriods = recurringDto.numberOfPeriods();
        UUID recurringGroupId = UUID.randomUUID();
        List<TransactionResponseDTO> createdTransactions = new ArrayList<>();

        FinancialPeriod initialPeriod = periodRepository.findById(dto.periodId())
                .orElseThrow(() -> new ResourceNotFoundException("Período financeiro não encontrado"));

        FinancialPlan plan = initialPeriod.getFinancialPlan();
        int startMonth = initialPeriod.getMonth();
        int startYear = initialPeriod.getYear();

        for (int i = 0; i < numberOfPeriods; i++) {
            int totalMonths = startMonth - 1 + i;
            int year = startYear + totalMonths / 12;
            int month = totalMonths % 12 + 1;

            FinancialPeriod period = findOrCreatePeriod(month, year, plan);

            Transaction transaction = mapper.toEntity(dto);
            transaction.setPeriod(period);
            validateResponsibleUser(transaction);
            transaction.setRecurringGroupId(recurringGroupId);
            transaction.setTransactionCategory(resolveCategory(dto.category()));
            transaction.setOrder(getNextOrder(period.getId()));

            LocalDateTime now = LocalDateTime.now();
            int day = now.getDayOfMonth();
            int maxDay = java.time.YearMonth.of(year, month).lengthOfMonth();
            if (day > maxDay) {
                day = maxDay;
            }
            transaction.setDateTime(LocalDateTime.of(year, month, day, now.getHour(), now.getMinute(), now.getSecond()));
            transaction.setDueDate(shiftToPeriod(transaction.getDueDate(), year, month));
            transaction.setPaymentDate(shiftToPeriod(transaction.getPaymentDate(), year, month));

            createdTransactions.add(mapper.toDto(repository.save(transaction)));
        }
        return createdTransactions;
    }

    private FinancialPeriod findOrCreatePeriod(int month, int year, FinancialPlan plan) {
        return periodRepository.findByMonthAndYearAndFinancialPlanId(month, year, plan.getId())
                .orElseGet(() -> {
                    FinancialPeriod newPeriod = new FinancialPeriod();
                    newPeriod.setMonth(month);
                    newPeriod.setYear(year);
                    newPeriod.setFinancialPlan(plan);
                    newPeriod.setMonthlyBalance(BigDecimal.ZERO);
                    return periodRepository.save(newPeriod);
                });
    }

    public List<TransactionResponseDTO> findAllByPeriod(UUID periodId) {
        List<Transaction> transactionList = repository.findByPeriodIdOrderByOrderAsc(periodId);
        return mapper.toDtoList(transactionList);
    }

    public TransactionResponseDTO findById(UUID id) {
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada"));
    }

    @Transactional
    public TransactionResponseDTO update(UUID id, TransactionRequestDTO dto) {
        Transaction entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada"));
        mapper.updateEntityFromDto(dto, entity);
        validateResponsibleUser(entity);
        entity.setTransactionCategory(resolveCategory(dto.category()));
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public TransactionResponseDTO updatePartial(UUID id, Map<String, Object> updates) {
        Transaction transaction = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada"));

        updates.forEach((key, value) -> {
            switch (key) {
                case "amount" -> transaction.setAmount(new BigDecimal(value.toString()));
                case "description" -> transaction.setDescription((String) value);
                case "type" -> transaction.setType(TransactionType.valueOf((String) value));
                case "category" -> transaction.setTransactionCategory(resolveCategory(parseCategory(value)));
                case "responsibleUserId" -> {
                    if (value == null) {
                        transaction.setResponsibleUser(null);
                    } else {
                        transaction.setResponsibleUser(
                                userRepository.findById(UUID.fromString(value.toString()))
                                        .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado!")));
                    }
                }
                case "order" -> transaction.setOrder(value != null ? Integer.valueOf(value.toString()) : null);
                case "creditCardInvoiceId" -> {
                    if (value == null) {
                        transaction.setCreditCardInvoice(null);
                    } else {
                        CreditCardInvoice invoice = invoiceRepository.findById(UUID.fromString(value.toString()))
                                .orElseThrow(() -> new ResourceNotFoundException("Fatura de cartão não encontrada!"));
                        transaction.setCreditCardInvoice(invoice);
                    }
                }
                case "isClearedByInvoice" -> transaction.setClearedByInvoice((Boolean) value);
                case "dueDate" -> transaction.setDueDate(value != null ? LocalDate.parse(value.toString()) : null);
                case "paymentDate" -> transaction.setPaymentDate(value != null ? LocalDate.parse(value.toString()) : null);
                case "paymentStatus" -> transaction.setPaymentStatus(value != null ? PaymentStatus.valueOf(value.toString()) : PaymentStatus.PENDING);
            }
        });

        validateResponsibleUser(transaction);

        return mapper.toDto(repository.save(transaction));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Transação não encontrada para exclusão");
        }
        repository.deleteById(id);
    }

    private Integer getNextOrder(UUID periodId) {
        return repository.findMaxOrderByPeriodId(periodId) + 1;
    }

    private TransactionCategory resolveCategory(TransactionCategoryDTO categoryDto) {
        if (categoryDto == null) {
            return null;
        }

        if (categoryDto.id() != null) {
            return transactionCategoryRepository.findById(categoryDto.id())
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria de transação não encontrada"));
        }

        if (categoryDto.name() == null || categoryDto.name().isBlank()) {
            return null;
        }

        String normalizedName = categoryDto.name().trim();
        return transactionCategoryRepository.findByNameIgnoreCase(normalizedName)
                .orElseGet(() -> transactionCategoryRepository.save(new TransactionCategory(normalizedName)));
    }

    private TransactionCategoryDTO parseCategory(Object value) {
        if (value == null) {
            return null;
        }

        if (!(value instanceof Map<?, ?> categoryMap)) {
            throw new IllegalArgumentException("Campo 'category' inválido");
        }

        Object idValue = categoryMap.get("id");
        Object nameValue = categoryMap.get("name");

        UUID id = idValue == null ? null : UUID.fromString(idValue.toString());
        String name = Objects.toString(nameValue, null);

        return new TransactionCategoryDTO(id, name);
    }

    private LocalDate shiftToPeriod(LocalDate date, int year, int month) {
        if (date == null) {
            return null;
        }

        int day = Math.min(date.getDayOfMonth(), java.time.YearMonth.of(year, month).lengthOfMonth());
        return LocalDate.of(year, month, day);
    }

    private void validateResponsibleUser(Transaction transaction) {
        User responsibleUser = transaction.getResponsibleUser();
        if (responsibleUser == null) {
            return;
        }

        FinancialPlan plan = transaction.getPeriod() != null ? transaction.getPeriod().getFinancialPlan() : null;
        if (plan == null) {
            return;
        }

        if (!financialPlanService.planHasParticipant(plan, responsibleUser.getId())) {
            throw new IllegalArgumentException("O responsável precisa participar do plano.");
        }
    }
}
