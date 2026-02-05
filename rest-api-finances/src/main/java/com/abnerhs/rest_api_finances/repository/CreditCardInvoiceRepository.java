package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.CreditCardInvoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CreditCardInvoiceRepository extends JpaRepository<CreditCardInvoice, UUID> {
}
