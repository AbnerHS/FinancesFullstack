package com.abnerhs.rest_api_finances.model;

import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "financial_plans")
public class FinancialPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false)
    private UUID id;

    private String name;

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "financial_plan_partners",
            joinColumns = @JoinColumn(name = "plan_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Fetch(FetchMode.SUBSELECT)
    private List<User> partners = new ArrayList<>();

    @Column(name = "active_invite_token")
    private String activeInviteToken;

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
    public List<User> getPartners() { return partners; }
    public void setPartners(List<User> partners) { this.partners = partners; }
    public String getActiveInviteToken() { return activeInviteToken; }
    public void setActiveInviteToken(String activeInviteToken) { this.activeInviteToken = activeInviteToken; }

    public List<FinancialPeriod> getPeriods() {
        return periods;
    }

    public void setPeriods(List<FinancialPeriod> periods) {
        this.periods = periods;
    }

    public boolean isOwner(UUID userId) {
        return owner != null && owner.getId() != null && owner.getId().equals(userId);
    }

    public boolean hasPartner(UUID userId) {
        return partners.stream()
                .anyMatch(partner -> partner.getId() != null && partner.getId().equals(userId));
    }

    public boolean hasParticipant(UUID userId) {
        return isOwner(userId) || hasPartner(userId);
    }

    public void addPartner(User user) {
        if (user == null || user.getId() == null || hasParticipant(user.getId())) {
            return;
        }

        partners.add(user);
    }

    public boolean removePartner(UUID userId) {
        return partners.removeIf(partner -> partner.getId() != null && partner.getId().equals(userId));
    }
}
