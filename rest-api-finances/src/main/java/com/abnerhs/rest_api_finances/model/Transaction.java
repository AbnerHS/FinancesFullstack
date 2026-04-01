package com.abnerhs.rest_api_finances.model;

import com.abnerhs.rest_api_finances.model.enums.BillingDocumentType;
import com.abnerhs.rest_api_finances.model.enums.PaymentStatus;
import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String description;

    @Column(precision = 19, scale = 5)
    private BigDecimal amount;

    @Column(name = "datetime", updatable = false)
    private LocalDateTime dateTime;

    @PrePersist
    protected void onCreate() {
        if (this.dateTime == null) {
            this.dateTime = LocalDateTime.now();
        }
    }

    @Enumerated(EnumType.STRING)
    private TransactionType type; // REVENUE ou EXPENSE

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private TransactionCategory transactionCategory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id")
    private FinancialPeriod period;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_user_id")
    private User responsibleUser;

    private UUID recurringGroupId;

    @Column(name = "display_order")
    private Integer order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_card_invoice_id")
    private CreditCardInvoice creditCardInvoice;

    @Column(name = "is_cleared_by_invoice", nullable = false)
    private boolean clearedByInvoice;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_document_type")
    private BillingDocumentType billingDocumentType;

    @Column(name = "billing_document_url", length = 2048)
    private String billingDocumentUrl;

    @Column(name = "billing_document_file_name")
    private String billingDocumentFileName;

    @Column(name = "billing_document_mime_type")
    private String billingDocumentMimeType;

    @Column(name = "billing_document_storage_key")
    private String billingDocumentStorageKey;

    @Column(name = "billing_document_uploaded_at")
    private LocalDateTime billingDocumentUploadedAt;

    public Transaction() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }

    public TransactionType getType() {
        return type;
    }

    public void setType(TransactionType type) {
        this.type = type;
    }

    public TransactionCategory getTransactionCategory() {
        return transactionCategory;
    }

    public void setTransactionCategory(TransactionCategory transactionCategory) {
        this.transactionCategory = transactionCategory;
    }

    public FinancialPeriod getPeriod() {
        return period;
    }

    public void setPeriod(FinancialPeriod period) {
        this.period = period;
    }

    public User getResponsibleUser() {
        return responsibleUser;
    }

    public void setResponsibleUser(User responsibleUser) {
        this.responsibleUser = responsibleUser;
    }

    public UUID getRecurringGroupId() {
        return recurringGroupId;
    }

    public void setRecurringGroupId(UUID recurringGroupId) {
        this.recurringGroupId = recurringGroupId;
    }

    public Integer getOrder() {
        return order;
    }

    public void setOrder(Integer order) {
        this.order = order;
    }

    public CreditCardInvoice getCreditCardInvoice() {
        return creditCardInvoice;
    }

    public void setCreditCardInvoice(CreditCardInvoice creditCardInvoice) {
        this.creditCardInvoice = creditCardInvoice;
    }

    public boolean isClearedByInvoice() {
        return clearedByInvoice;
    }

    public void setClearedByInvoice(Boolean clearedByInvoice) {
        this.clearedByInvoice = clearedByInvoice;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public BillingDocumentType getBillingDocumentType() {
        return billingDocumentType;
    }

    public void setBillingDocumentType(BillingDocumentType billingDocumentType) {
        this.billingDocumentType = billingDocumentType;
    }

    public String getBillingDocumentUrl() {
        return billingDocumentUrl;
    }

    public void setBillingDocumentUrl(String billingDocumentUrl) {
        this.billingDocumentUrl = billingDocumentUrl;
    }

    public String getBillingDocumentFileName() {
        return billingDocumentFileName;
    }

    public void setBillingDocumentFileName(String billingDocumentFileName) {
        this.billingDocumentFileName = billingDocumentFileName;
    }

    public String getBillingDocumentMimeType() {
        return billingDocumentMimeType;
    }

    public void setBillingDocumentMimeType(String billingDocumentMimeType) {
        this.billingDocumentMimeType = billingDocumentMimeType;
    }

    public String getBillingDocumentStorageKey() {
        return billingDocumentStorageKey;
    }

    public void setBillingDocumentStorageKey(String billingDocumentStorageKey) {
        this.billingDocumentStorageKey = billingDocumentStorageKey;
    }

    public LocalDateTime getBillingDocumentUploadedAt() {
        return billingDocumentUploadedAt;
    }

    public void setBillingDocumentUploadedAt(LocalDateTime billingDocumentUploadedAt) {
        this.billingDocumentUploadedAt = billingDocumentUploadedAt;
    }
}
