package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.CreditCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CreditCardRepository extends JpaRepository<CreditCard, UUID> {

    List<CreditCard> findByUserId(UUID userId);
}
