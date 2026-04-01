package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.BillingDocumentRequestDTO;
import com.abnerhs.rest_api_finances.dto.RecurringTransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import com.abnerhs.rest_api_finances.dto.TransactionDocumentScope;
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
import com.abnerhs.rest_api_finances.model.enums.BillingDocumentType;
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
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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

    @Autowired
    private LocalBillingDocumentStorageService billingDocumentStorageService;

    @Transactional
    public TransactionResponseDTO create(TransactionRequestDTO dto) {
        FinancialPeriod period = getAccessiblePeriod(dto.periodId());
        Transaction transaction = mapper.toEntity(dto);
        transaction.setPeriod(period);
        validateResponsibleUser(transaction);
        transaction.setTransactionCategory(resolveCategory(dto.category()));
        applyLinkBillingDocument(transaction, dto.billingDocument(), false);
        transaction.setOrder(getNextOrder(period.getId()));
        return mapper.toDto(repository.save(transaction));
    }

    @Transactional
    public List<TransactionResponseDTO> createRecurring(RecurringTransactionRequestDTO recurringDto) {
        TransactionRequestDTO dto = recurringDto.transaction();
        int numberOfPeriods = recurringDto.numberOfPeriods();
        UUID recurringGroupId = UUID.randomUUID();
        List<TransactionResponseDTO> createdTransactions = new ArrayList<>();

        FinancialPeriod initialPeriod = getAccessiblePeriod(dto.periodId());
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
            applyLinkBillingDocument(transaction, dto.billingDocument(), false);
            transaction.setOrder(getNextOrder(period.getId()));

            LocalDateTime now = LocalDateTime.now();
            int day = Math.min(
                    now.getDayOfMonth(),
                    java.time.YearMonth.of(year, month).lengthOfMonth()
            );
            transaction.setDateTime(LocalDateTime.of(year, month, day, now.getHour(), now.getMinute(), now.getSecond()));
            applyRecurringDates(transaction, year, month, i);

            createdTransactions.add(mapper.toDto(repository.save(transaction)));
        }
        return createdTransactions;
    }

    public List<TransactionResponseDTO> findAllByPeriod(UUID periodId) {
        FinancialPeriod period = getAccessiblePeriod(periodId);
        List<Transaction> transactionList = repository.findByPeriodIdOrderByOrderAsc(period.getId());
        return mapper.toDtoList(transactionList);
    }

    public TransactionResponseDTO findById(UUID id) {
        return mapper.toDto(getAccessibleTransaction(id));
    }

    @Transactional
    public TransactionResponseDTO update(UUID id, TransactionRequestDTO dto) {
        Transaction entity = getAccessibleTransaction(id);
        String previousStorageKey = entity.getBillingDocumentStorageKey();
        boolean hadExistingBillingDocument = hasBillingDocument(entity);

        mapper.updateEntityFromDto(dto, entity);
        validateResponsibleUser(entity);
        entity.setTransactionCategory(resolveCategory(dto.category()));
        applyLinkBillingDocument(entity, dto.billingDocument(), hadExistingBillingDocument);

        Transaction saved = repository.save(entity);
        cleanupStorageKeyIfUnused(previousStorageKey, saved.getBillingDocumentStorageKey());
        return mapper.toDto(saved);
    }

    @Transactional
    public TransactionResponseDTO updatePartial(UUID id, Map<String, Object> updates) {
        Transaction transaction = getAccessibleTransaction(id);
        String previousStorageKey = transaction.getBillingDocumentStorageKey();
        boolean hadExistingBillingDocument = hasBillingDocument(transaction);
        BillingDocumentRequestDTO billingDocumentUpdate = null;
        boolean billingDocumentPresent = updates.containsKey("billingDocument");

        if (billingDocumentPresent) {
            billingDocumentUpdate = parseBillingDocument(updates.get("billingDocument"));
        }

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
                                        .orElseThrow(() -> new ResourceNotFoundException("Usu\u00e1rio respons\u00e1vel n\u00e3o encontrado!"))
                        );
                    }
                }
                case "order" -> transaction.setOrder(value != null ? Integer.valueOf(value.toString()) : null);
                case "creditCardInvoiceId" -> {
                    if (value == null) {
                        transaction.setCreditCardInvoice(null);
                    } else {
                        CreditCardInvoice invoice = invoiceRepository.findById(UUID.fromString(value.toString()))
                                .orElseThrow(() -> new ResourceNotFoundException("Fatura de cart\u00e3o n\u00e3o encontrada!"));
                        transaction.setCreditCardInvoice(invoice);
                    }
                }
                case "isClearedByInvoice" -> transaction.setClearedByInvoice((Boolean) value);
                case "dueDate" -> transaction.setDueDate(value != null ? LocalDate.parse(value.toString()) : null);
                case "paymentDate" -> transaction.setPaymentDate(value != null ? LocalDate.parse(value.toString()) : null);
                case "paymentStatus" -> transaction.setPaymentStatus(value != null ? PaymentStatus.valueOf(value.toString()) : PaymentStatus.PENDING);
                case "billingDocument" -> {
                    // handled after field updates so we can validate against the final due date
                }
                default -> {
                }
            }
        });

        if (billingDocumentPresent) {
            applyLinkBillingDocument(transaction, billingDocumentUpdate, hadExistingBillingDocument);
        }

        validateResponsibleUser(transaction);

        Transaction saved = repository.save(transaction);
        cleanupStorageKeyIfUnused(previousStorageKey, saved.getBillingDocumentStorageKey());
        return mapper.toDto(saved);
    }

    @Transactional
    public TransactionResponseDTO uploadBillingDocument(UUID id, MultipartFile file, TransactionDocumentScope scope) {
        Transaction anchorTransaction = getAccessibleTransaction(id);
        List<Transaction> targetTransactions = resolveTargetTransactions(anchorTransaction, scope);
        targetTransactions.forEach(transaction ->
                validateCanAttachBillingDocument(hasBillingDocument(transaction), transaction.getDueDate()));

        LocalBillingDocumentStorageService.StoredFileMetadata storedFile = billingDocumentStorageService.store(file);
        Set<String> previousStorageKeys = collectPreviousStorageKeys(targetTransactions);

        try {
            for (Transaction transaction : targetTransactions) {
                applyStoredBillingDocument(transaction, storedFile);
            }

            repository.saveAll(targetTransactions);
            cleanupStorageKeysIfUnused(previousStorageKeys, storedFile.storageKey());
        } catch (RuntimeException exception) {
            billingDocumentStorageService.delete(storedFile.storageKey());
            throw exception;
        }

        return mapper.toDto(anchorTransaction);
    }

    @Transactional
    public TransactionResponseDTO deleteBillingDocument(UUID id, TransactionDocumentScope scope) {
        Transaction anchorTransaction = getAccessibleTransaction(id);
        List<Transaction> targetTransactions = resolveTargetTransactions(anchorTransaction, scope);
        Set<String> previousStorageKeys = collectPreviousStorageKeys(targetTransactions);

        targetTransactions.forEach(this::clearBillingDocument);
        repository.saveAll(targetTransactions);
        cleanupStorageKeysIfUnused(previousStorageKeys, null);

        return mapper.toDto(anchorTransaction);
    }

    public StoredBillingDocument downloadBillingDocument(UUID id) {
        Transaction transaction = getAccessibleTransaction(id);
        if (transaction.getBillingDocumentType() != BillingDocumentType.FILE
                || transaction.getBillingDocumentStorageKey() == null
                || transaction.getBillingDocumentStorageKey().isBlank()) {
            throw new ResourceNotFoundException("Documento para pagamento n\u00e3o encontrado.");
        }

        return billingDocumentStorageService.read(
                transaction.getBillingDocumentStorageKey(),
                transaction.getBillingDocumentFileName(),
                transaction.getBillingDocumentMimeType()
        );
    }

    @Transactional
    public void delete(UUID id) {
        Transaction entity = getAccessibleTransaction(id);
        String previousStorageKey = entity.getBillingDocumentStorageKey();
        repository.delete(entity);
        cleanupStorageKeyIfUnused(previousStorageKey, null);
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

    private Integer getNextOrder(UUID periodId) {
        return repository.findMaxOrderByPeriodId(periodId) + 1;
    }

    private TransactionCategory resolveCategory(TransactionCategoryDTO categoryDto) {
        if (categoryDto == null) {
            return null;
        }

        if (categoryDto.id() != null) {
            return transactionCategoryRepository.findById(categoryDto.id())
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria de transa\u00e7\u00e3o n\u00e3o encontrada"));
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
            throw new IllegalArgumentException("Campo 'category' inv\u00e1lido");
        }

        Object idValue = categoryMap.get("id");
        Object nameValue = categoryMap.get("name");

        UUID id = idValue == null ? null : UUID.fromString(idValue.toString());
        String name = Objects.toString(nameValue, null);

        return new TransactionCategoryDTO(id, name);
    }

    private BillingDocumentRequestDTO parseBillingDocument(Object value) {
        if (value == null) {
            return null;
        }

        if (!(value instanceof Map<?, ?> documentMap)) {
            throw new IllegalArgumentException("Campo 'billingDocument' inv\u00e1lido");
        }

        Object typeValue = documentMap.get("type");
        if (typeValue == null) {
            throw new IllegalArgumentException("O tipo do documento \u00e9 obrigat\u00f3rio.");
        }

        BillingDocumentType type = BillingDocumentType.valueOf(typeValue.toString());
        String url = Objects.toString(documentMap.get("url"), null);

        return new BillingDocumentRequestDTO(type, url);
    }

    private void applyLinkBillingDocument(
            Transaction transaction,
            BillingDocumentRequestDTO billingDocument,
            boolean hadExistingBillingDocument
    ) {
        if (billingDocument == null) {
            clearBillingDocument(transaction);
            return;
        }

        if (billingDocument.type() != BillingDocumentType.LINK) {
            throw new IllegalArgumentException("Documentos do tipo arquivo devem ser enviados pelo endpoint de upload.");
        }

        validateCanAttachBillingDocument(hadExistingBillingDocument, transaction.getDueDate());

        String url = billingDocument.url() == null ? "" : billingDocument.url().trim();
        if (url.isBlank()) {
            throw new IllegalArgumentException("Informe um link v\u00e1lido para o documento.");
        }

        clearBillingDocument(transaction);
        transaction.setBillingDocumentType(BillingDocumentType.LINK);
        transaction.setBillingDocumentUrl(url);
    }

    private void applyStoredBillingDocument(
            Transaction transaction,
            LocalBillingDocumentStorageService.StoredFileMetadata storedFile
    ) {
        clearBillingDocument(transaction);
        transaction.setBillingDocumentType(BillingDocumentType.FILE);
        transaction.setBillingDocumentStorageKey(storedFile.storageKey());
        transaction.setBillingDocumentFileName(storedFile.fileName());
        transaction.setBillingDocumentMimeType(storedFile.mimeType());
        transaction.setBillingDocumentUploadedAt(LocalDateTime.now());
    }

    private void clearBillingDocument(Transaction transaction) {
        transaction.setBillingDocumentType(null);
        transaction.setBillingDocumentUrl(null);
        transaction.setBillingDocumentFileName(null);
        transaction.setBillingDocumentMimeType(null);
        transaction.setBillingDocumentStorageKey(null);
        transaction.setBillingDocumentUploadedAt(null);
    }

    private boolean hasBillingDocument(Transaction transaction) {
        return transaction.getBillingDocumentType() != null;
    }

    private void validateCanAttachBillingDocument(boolean hadExistingBillingDocument, LocalDate dueDate) {
        if (!hadExistingBillingDocument && dueDate == null) {
            throw new IllegalArgumentException("Somente transa\u00e7\u00f5es com vencimento podem receber documento para pagamento.");
        }
    }

    private Set<String> collectPreviousStorageKeys(List<Transaction> transactions) {
        Set<String> storageKeys = new LinkedHashSet<>();
        for (Transaction transaction : transactions) {
            if (transaction.getBillingDocumentStorageKey() != null
                    && !transaction.getBillingDocumentStorageKey().isBlank()) {
                storageKeys.add(transaction.getBillingDocumentStorageKey());
            }
        }
        return storageKeys;
    }

    private void cleanupStorageKeysIfUnused(Set<String> previousStorageKeys, String currentStorageKey) {
        for (String previousStorageKey : previousStorageKeys) {
            cleanupStorageKeyIfUnused(previousStorageKey, currentStorageKey);
        }
    }

    private void cleanupStorageKeyIfUnused(String previousStorageKey, String currentStorageKey) {
        if (previousStorageKey == null || previousStorageKey.isBlank() || previousStorageKey.equals(currentStorageKey)) {
            return;
        }

        if (repository.countByBillingDocumentStorageKey(previousStorageKey) == 0) {
            billingDocumentStorageService.delete(previousStorageKey);
        }
    }

    private List<Transaction> resolveTargetTransactions(Transaction anchorTransaction, TransactionDocumentScope scope) {
        if (scope != TransactionDocumentScope.GROUP || anchorTransaction.getRecurringGroupId() == null) {
            return List.of(anchorTransaction);
        }

        List<Transaction> groupTransactions = repository.findByRecurringGroupId(anchorTransaction.getRecurringGroupId());
        if (groupTransactions.isEmpty()) {
            return List.of(anchorTransaction);
        }

        return groupTransactions;
    }

    private FinancialPeriod getAccessiblePeriod(UUID periodId) {
        FinancialPeriod period = periodRepository.findById(periodId)
                .orElseThrow(() -> new ResourceNotFoundException("Per\u00edodo financeiro n\u00e3o encontrado"));
        if (period.getFinancialPlan() != null && period.getFinancialPlan().getId() != null) {
            financialPlanService.assertCurrentUserCanAccessPlan(period.getFinancialPlan().getId());
        }
        return period;
    }

    private Transaction getAccessibleTransaction(UUID id) {
        Transaction transaction = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transa\u00e7\u00e3o n\u00e3o encontrada"));
        if (transaction.getPeriod() != null
                && transaction.getPeriod().getFinancialPlan() != null
                && transaction.getPeriod().getFinancialPlan().getId() != null) {
            financialPlanService.assertCurrentUserCanAccessPlan(transaction.getPeriod().getFinancialPlan().getId());
        }
        return transaction;
    }

    private LocalDate shiftToPeriod(LocalDate date, int year, int month) {
        if (date == null) {
            return null;
        }

        int day = Math.min(date.getDayOfMonth(), java.time.YearMonth.of(year, month).lengthOfMonth());
        return LocalDate.of(year, month, day);
    }

    private void applyRecurringDates(Transaction transaction, int year, int month, int occurrenceIndex) {
        transaction.setDueDate(shiftToPeriod(transaction.getDueDate(), year, month));

        if (occurrenceIndex == 0) {
            return;
        }

        transaction.setPaymentDate(null);
        transaction.setPaymentStatus(PaymentStatus.PENDING);
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
            throw new IllegalArgumentException("O respons\u00e1vel precisa participar do plano.");
        }
    }
}
