package com.abnerhs.rest_api_finances.model;

import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "financial_plans")
public class FinancialPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name= "id", columnDefinition = "RAW(16)", updatable = false)
    private UUID id;

    private String name; // Ex: "Orçamento Mensal Familiar"

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne
    @JoinColumn(name = "partner_id")
    private User partner; // Opcional, para compartilhar com outra pessoa

    @OneToMany(mappedBy = "financialPlan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Fetch(FetchMode.SUBSELECT)
    private List<FinancialPeriod> periods;

    public FinancialPlan() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public User getPartner() { return partner; }
    public void setPartner(User partner) { this.partner = partner; }

    public List<FinancialPeriod> getPeriods() {
        return periods;
    }

    public void setPeriods(List<FinancialPeriod> periods) {
        this.periods = periods;
    }
}