package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.RecurringTransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.TransactionMapper;
import com.abnerhs.rest_api_finances.model.CreditCardInvoice;
import com.abnerhs.rest_api_finances.model.FinancialPeriod;
import com.abnerhs.rest_api_finances.model.FinancialPlan;
import com.abnerhs.rest_api_finances.model.Transaction;
import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import com.abnerhs.rest_api_finances.repository.CreditCardInvoiceRepository;
import com.abnerhs.rest_api_finances.repository.FinancialPeriodRepository;
import com.abnerhs.rest_api_finances.repository.TransactionRepository;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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

    @Transactional
    public TransactionResponseDTO create(TransactionRequestDTO dto) {
        Transaction transaction = mapper.toEntity(dto);
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
            // Calcular mês e ano para a iteração atual
            int totalMonths = startMonth - 1 + i;
            int year = startYear + totalMonths / 12;
            int month = totalMonths % 12 + 1;

            // Buscar ou criar o período
            FinancialPeriod period = findOrCreatePeriod(month, year, plan);

            // Criar a transação
            Transaction transaction = mapper.toEntity(dto);
            transaction.setPeriod(period);
            transaction.setRecurringGroupId(recurringGroupId);

            // Ajustar a data para o mês correto
            LocalDateTime now = LocalDateTime.now();
            int day = now.getDayOfMonth();
            int maxDay = java.time.YearMonth.of(year, month).lengthOfMonth();
            if (day > maxDay) {
                day = maxDay;
            }
            transaction
                    .setDateTime(LocalDateTime.of(year, month, day, now.getHour(), now.getMinute(), now.getSecond()));

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
                    newPeriod.setMonthlyBalance(BigDecimal.ZERO); // Inicializar saldo
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
        return mapper.toDto(repository.save(entity));
    }

    @Transactional
    public TransactionResponseDTO updatePartial(UUID id, Map<String, Object> updates) {
        Transaction transaction = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(("Transação não encontrada")));

        updates.forEach((key, value) -> {
            switch (key) {
                case "amount" -> transaction.setAmount(new BigDecimal(value.toString()));
                case "description" -> transaction.setDescription((String) value);
                case "type" -> transaction.setType(TransactionType.valueOf((String) value));
                case "responsibilityTag" -> transaction.setResponsibilityTag((String) value);
                case "responsibleUserId" -> {
                    if (value == null) {
                        transaction.setResponsibleUser(null);
                    } else {
                        transaction.setResponsibleUser(
                                userRepository.findById(UUID.fromString(value.toString()))
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                "Usuário responsável não encontrado!")));
                    }
                }
                case "order" -> transaction.setOrder(value != null ? Integer.valueOf(value.toString()) : null);
                case "creditCardInvoiceId" -> {
                    if (value == null) {
                        transaction.setCreditCardInvoice(null);
                        break;
                    }
                    CreditCardInvoice invoice = invoiceRepository.findById(UUID.fromString(value.toString()))
                            .orElseThrow(() -> new ResourceNotFoundException("Fatura de cartão não encontrada!"));
                    transaction.setCreditCardInvoice(invoice);
                }
                case "isClearedByInvoice" -> {
                    transaction.setClearedByInvoice((Boolean) value);
                }
            }
        });

        return mapper.toDto(repository.save(transaction));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Transação não encontrada para exclusão");
        }
        repository.deleteById(id);
    }
}
