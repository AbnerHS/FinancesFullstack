package com.abnerhs.rest_api_finances.model;

import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import jakarta.persistence.*;

import java.math.BigDecimal;
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

    private String responsibilityTag;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id")
    private FinancialPeriod period;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_user_id")
    private User responsibleUser;

    private UUID recurringGroupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_card_invoice_id")
    private CreditCardInvoice creditCardInvoice;

    @Column(name = "is_cleared_by_invoice", nullable = false)
    private boolean isClearedByInvoice;

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

    public String getResponsibilityTag() {
        return responsibilityTag;
    }

    public void setResponsibilityTag(String responsibilityTag) {
        this.responsibilityTag = responsibilityTag;
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

    public CreditCardInvoice getCreditCardInvoice() {
        return creditCardInvoice;
    }

    public void setCreditCardInvoice(CreditCardInvoice creditCardInvoice) {
        this.creditCardInvoice = creditCardInvoice;
    }

    public boolean getClearedByInvoice() {
        return isClearedByInvoice;
    }

    public void setClearedByInvoice(boolean clearedByInvoice) {
        this.isClearedByInvoice = clearedByInvoice;
    }
}