package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.CreditCardInvoiceMapper;
import com.abnerhs.rest_api_finances.model.CreditCardInvoice;
import com.abnerhs.rest_api_finances.repository.CreditCardInvoiceRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CreditCardInvoiceService {

    @Autowired
    private CreditCardInvoiceRepository repository;

    @Autowired
    private CreditCardInvoiceMapper mapper;

    @Transactional
    public CreditCardInvoiceResponseDTO create(CreditCardInvoiceRequestDTO dto) {
        CreditCardInvoice entity = mapper.toEntity(dto);
        return mapper.toDto(repository.save(entity));
    }

    public List<CreditCardInvoiceResponseDTO> findAllByCreditCard(UUID creditCardId) {
        List<CreditCardInvoice> invoices = repository.findByCreditCardId(creditCardId);
        return mapper.toDtoList(invoices);
    }

    public CreditCardInvoiceResponseDTO findById(UUID id) {
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Fatura não encontrada"));
    }

    @Transactional
    public CreditCardInvoiceResponseDTO update(UUID id, CreditCardInvoiceRequestDTO dto) {
        CreditCardInvoice entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fatura não encontrada"));
        mapper.updateEntityFromDto(dto, entity);
        return mapper.toDto(repository.save(entity));
    }

    //update partial

    @Transactional
    public void delete(UUID id){
        if(!repository.existsById(id)) {
            throw new ResourceNotFoundException("Fatura não encontrada para exclusão");
        }
        repository.deleteById(id);
    }


}
