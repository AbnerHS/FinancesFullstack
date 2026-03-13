package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.TransactionCategoryRequestDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.model.TransactionCategory;
import com.abnerhs.rest_api_finances.repository.TransactionCategoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionCategoryServiceTest {

    @Mock
    private TransactionCategoryRepository repository;

    @InjectMocks
    private TransactionCategoryService service;

    @Test
    void shouldCreateCategory() {
        TransactionCategory category = new TransactionCategory("Casa");
        category.setId(UUID.randomUUID());

        when(repository.findByNameIgnoreCase("Casa")).thenReturn(Optional.empty());
        when(repository.save(any(TransactionCategory.class))).thenReturn(category);

        var response = service.create(new TransactionCategoryRequestDTO("  Casa  "));

        assertEquals(category.getId(), response.id());
        assertEquals("Casa", response.name());
    }

    @Test
    void shouldRejectDuplicatedCategoryOnCreate() {
        TransactionCategory existing = new TransactionCategory("Casa");
        existing.setId(UUID.randomUUID());

        when(repository.findByNameIgnoreCase("Casa")).thenReturn(Optional.of(existing));

        assertThrows(IllegalArgumentException.class, () ->
                service.create(new TransactionCategoryRequestDTO("Casa")));
    }

    @Test
    void shouldReturnAllCategoriesOrderedByName() {
        TransactionCategory casa = new TransactionCategory("Casa");
        casa.setId(UUID.randomUUID());
        TransactionCategory lazer = new TransactionCategory("Lazer");
        lazer.setId(UUID.randomUUID());

        when(repository.findAllByOrderByNameAsc()).thenReturn(List.of(casa, lazer));

        var response = service.findAll();

        assertEquals(2, response.size());
        assertEquals("Casa", response.getFirst().name());
        assertEquals("Lazer", response.getLast().name());
    }

    @Test
    void shouldUpdateCategory() {
        UUID id = UUID.randomUUID();
        TransactionCategory category = new TransactionCategory("Casa");
        category.setId(id);

        when(repository.findById(id)).thenReturn(Optional.of(category));
        when(repository.findByNameIgnoreCase("Moradia")).thenReturn(Optional.empty());
        when(repository.save(category)).thenReturn(category);

        var response = service.update(id, new TransactionCategoryRequestDTO("Moradia"));

        assertEquals("Moradia", response.name());
        assertEquals("Moradia", category.getName());
    }

    @Test
    void shouldRejectPartialUpdateWhenNameAlreadyExists() {
        UUID id = UUID.randomUUID();
        TransactionCategory category = new TransactionCategory("Casa");
        category.setId(id);
        TransactionCategory existing = new TransactionCategory("Mercado");
        existing.setId(UUID.randomUUID());

        when(repository.findById(id)).thenReturn(Optional.of(category));
        when(repository.findByNameIgnoreCase("Mercado")).thenReturn(Optional.of(existing));

        assertThrows(IllegalArgumentException.class, () ->
                service.updatePartial(id, Map.of("name", "Mercado")));
    }

    @Test
    void shouldThrowWhenDeletingMissingCategory() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.delete(id));
    }

    @Test
    void shouldDeleteCategory() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(true);

        service.delete(id);

        verify(repository).deleteById(id);
    }
}
