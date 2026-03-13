package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryRequestDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.TransactionCategory;
import com.abnerhs.rest_api_finances.repository.TransactionCategoryRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TransactionCategoryService {

    @Autowired
    private TransactionCategoryRepository repository;

    @Transactional
    public TransactionCategoryDTO create(TransactionCategoryRequestDTO dto) {
        String normalizedName = normalizeName(dto.name());
        ensureNameIsAvailable(normalizedName, null);

        return toDto(repository.save(new TransactionCategory(normalizedName)));
    }

    public List<TransactionCategoryDTO> findAll() {
        return repository.findAllByOrderByNameAsc().stream()
                .map(this::toDto)
                .toList();
    }

    public TransactionCategoryDTO findById(UUID id) {
        return repository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria de transação não encontrada"));
    }

    @Transactional
    public TransactionCategoryDTO update(UUID id, TransactionCategoryRequestDTO dto) {
        TransactionCategory category = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria de transação não encontrada"));

        String normalizedName = normalizeName(dto.name());
        ensureNameIsAvailable(normalizedName, id);

        category.setName(normalizedName);
        return toDto(repository.save(category));
    }

    @Transactional
    public TransactionCategoryDTO updatePartial(UUID id, Map<String, Object> updates) {
        TransactionCategory category = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria de transação não encontrada"));

        updates.forEach((key, value) -> {
            if ("name".equals(key)) {
                String normalizedName = normalizeName(value == null ? null : value.toString());
                ensureNameIsAvailable(normalizedName, id);
                category.setName(normalizedName);
            }
        });

        return toDto(repository.save(category));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Categoria de transação não encontrada para exclusão");
        }

        repository.deleteById(id);
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("O nome da categoria é obrigatório");
        }

        return name.trim();
    }

    private void ensureNameIsAvailable(String normalizedName, UUID currentId) {
        repository.findByNameIgnoreCase(normalizedName)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Já existe uma categoria com este nome");
                });
    }

    private TransactionCategoryDTO toDto(TransactionCategory category) {
        return new TransactionCategoryDTO(category.getId(), category.getName());
    }
}
