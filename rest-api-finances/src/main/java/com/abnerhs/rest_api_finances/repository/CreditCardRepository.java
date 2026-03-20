package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.CreditCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CreditCardRepository extends JpaRepository<CreditCard, UUID> {

    List<CreditCard> findByUserId(UUID userId);

    @Query("""
            select distinct c
            from CreditCard c
            where c.user.id = (
                select fp.owner.id
                from FinancialPlan fp
                where fp.id = :planId
            )
            or c.user.id in (
                select partner.id
                from FinancialPlan fp
                join fp.partners partner
                where fp.id = :planId
            )
            """)
    List<CreditCard> findAllByPlanId(@Param("planId") UUID planId);
}
