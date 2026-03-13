package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.CreditCardInvoiceMapper;
import com.abnerhs.rest_api_finances.model.CreditCardInvoice;
import com.abnerhs.rest_api_finances.repository.CreditCardInvoiceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditCardInvoiceServiceTest {

    @Mock
    private CreditCardInvoiceRepository repository;

    @Mock
    private CreditCardInvoiceMapper mapper;

    @InjectMocks
    private CreditCardInvoiceService service;

    @Test
    void shouldCreateInvoice() {
        CreditCardInvoiceRequestDTO dto = buildRequest();
        CreditCardInvoice entity = new CreditCardInvoice();
        CreditCardInvoice saved = new CreditCardInvoice();
        CreditCardInvoiceResponseDTO response = buildResponse();

        when(mapper.toEntity(dto)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(saved);
        when(mapper.toDto(saved)).thenReturn(response);

        assertEquals(response, service.create(dto));
    }

    @Test
    void shouldFindInvoicesByCreditCard() {
        UUID creditCardId = UUID.randomUUID();
        List<CreditCardInvoice> invoices = List.of(new CreditCardInvoice());
        List<CreditCardInvoiceResponseDTO> response = List.of(buildResponse());

        when(repository.findByCreditCardId(creditCardId)).thenReturn(invoices);
        when(mapper.toDtoList(invoices)).thenReturn(response);

        assertEquals(response, service.findAllByCreditCard(creditCardId));
    }

    @Test
    void shouldFindInvoicesByPeriod() {
        UUID periodId = UUID.randomUUID();
        List<CreditCardInvoice> invoices = List.of(new CreditCardInvoice());
        List<CreditCardInvoiceResponseDTO> response = List.of(buildResponse());

        when(repository.findByPeriodId(periodId)).thenReturn(invoices);
        when(mapper.toDtoList(invoices)).thenReturn(response);

        assertEquals(response, service.findAllByPeriod(periodId));
    }

    @Test
    void shouldFindInvoiceById() {
        UUID id = UUID.randomUUID();
        CreditCardInvoice invoice = new CreditCardInvoice();
        CreditCardInvoiceResponseDTO response = buildResponse();

        when(repository.findById(id)).thenReturn(Optional.of(invoice));
        when(mapper.toDto(invoice)).thenReturn(response);

        assertEquals(response, service.findById(id));
    }

    @Test
    void shouldThrowWhenInvoiceIsNotFoundById() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.findById(id));
    }

    @Test
    void shouldUpdateInvoice() {
        UUID id = UUID.randomUUID();
        CreditCardInvoiceRequestDTO dto = buildRequest();
        CreditCardInvoice entity = new CreditCardInvoice();
        CreditCardInvoiceResponseDTO response = buildResponse();

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        assertEquals(response, service.update(id, dto));
        verify(mapper).updateEntityFromDto(dto, entity);
    }

    @Test
    void shouldThrowWhenUpdatingMissingInvoice() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.update(id, buildRequest()));
    }

    @Test
    void shouldDeleteInvoice() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(true);

        service.delete(id);

        verify(repository).deleteById(id);
    }

    @Test
    void shouldRejectDeletingMissingInvoice() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.delete(id));
    }

    private CreditCardInvoiceRequestDTO buildRequest() {
        return new CreditCardInvoiceRequestDTO(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("120.50"));
    }

    private CreditCardInvoiceResponseDTO buildResponse() {
        return new CreditCardInvoiceResponseDTO(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("120.50"));
    }
}
