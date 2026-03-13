package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.TransactionCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionCategoryRepository extends JpaRepository<TransactionCategory, UUID> {

    Optional<TransactionCategory> findByNameIgnoreCase(String name);

    List<TransactionCategory> findAllByOrderByNameAsc();
}
