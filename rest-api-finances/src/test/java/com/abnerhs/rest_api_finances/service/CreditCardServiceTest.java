package com.abnerhs.rest_api_finances.service;

import com.abnerhs.rest_api_finances.dto.CreditCardRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.exception.ResourceNotFoundException;
import com.abnerhs.rest_api_finances.mapper.CreditCardMapper;
import com.abnerhs.rest_api_finances.model.CreditCard;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.repository.CreditCardRepository;
import com.abnerhs.rest_api_finances.repository.UserRepository;
import com.abnerhs.rest_api_finances.service.FinancialPlanService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditCardServiceTest {

    @Mock
    private CreditCardRepository repository;

    @Mock
    private CreditCardMapper mapper;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FinancialPlanService financialPlanService;

    @InjectMocks
    private CreditCardService service;

    @Test
    void shouldCreateCreditCard() {
        CreditCardRequestDTO dto = new CreditCardRequestDTO("Nubank", UUID.randomUUID());
        CreditCard entity = new CreditCard();
        CreditCard saved = new CreditCard();
        CreditCardResponseDTO response = new CreditCardResponseDTO(UUID.randomUUID(), "Nubank", dto.userId());

        when(mapper.toEntity(dto)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(saved);
        when(mapper.toDto(saved)).thenReturn(response);

        assertEquals(response, service.create(dto));
    }

    @Test
    void shouldFindAllCardsByUser() {
        UUID userId = UUID.randomUUID();
        List<CreditCard> cards = List.of(new CreditCard());
        List<CreditCardResponseDTO> response = List.of(new CreditCardResponseDTO(UUID.randomUUID(), "Visa", userId));

        when(repository.findByUserId(userId)).thenReturn(cards);
        when(mapper.toDtoList(cards)).thenReturn(response);

        assertEquals(response, service.findAllByUser(userId));
    }

    @Test
    void shouldFindAllCardsByPlan() {
        UUID planId = UUID.randomUUID();
        List<CreditCard> cards = List.of(new CreditCard());
        List<CreditCardResponseDTO> response = List.of(new CreditCardResponseDTO(UUID.randomUUID(), "Visa", UUID.randomUUID()));

        when(repository.findAllByPlanId(planId)).thenReturn(cards);
        when(mapper.toDtoList(cards)).thenReturn(response);

        assertEquals(response, service.findAllByPlan(planId));
        verify(financialPlanService).assertCurrentUserCanAccessPlan(planId);
    }

    @Test
    void shouldFindCardById() {
        UUID id = UUID.randomUUID();
        CreditCard card = new CreditCard();
        CreditCardResponseDTO response = new CreditCardResponseDTO(id, "Visa", UUID.randomUUID());

        when(repository.findById(id)).thenReturn(Optional.of(card));
        when(mapper.toDto(card)).thenReturn(response);

        assertEquals(response, service.findById(id));
    }

    @Test
    void shouldThrowWhenCardIsNotFoundById() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.findById(id));
    }

    @Test
    void shouldUpdateCard() {
        UUID id = UUID.randomUUID();
        CreditCardRequestDTO dto = new CreditCardRequestDTO("Master", UUID.randomUUID());
        CreditCard entity = new CreditCard();
        CreditCardResponseDTO response = new CreditCardResponseDTO(id, "Master", dto.userId());

        when(repository.findById(id)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(response);

        assertEquals(response, service.update(id, dto));
        verify(mapper).updateEntityFromDto(dto, entity);
    }

    @Test
    void shouldThrowWhenUpdatingMissingCard() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.update(id, new CreditCardRequestDTO("Visa", UUID.randomUUID())));
    }

    @Test
    void shouldPartiallyUpdateCard() {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        CreditCard card = new CreditCard();
        User user = new User("john@example.com", "encoded", "John");
        user.setId(userId);
        CreditCardResponseDTO response = new CreditCardResponseDTO(id, "Platinum", userId);

        when(repository.findById(id)).thenReturn(Optional.of(card));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(repository.save(card)).thenReturn(card);
        when(mapper.toDto(card)).thenReturn(response);

        CreditCardResponseDTO result = service.updatePartial(id, Map.of(
                "name", "Platinum",
                "userId", userId.toString()
        ));

        assertEquals(response, result);
        assertEquals("Platinum", card.getName());
        assertEquals(user, card.getUser());
    }

    @Test
    void shouldIgnoreUnknownFieldsOnPartialUpdate() {
        UUID id = UUID.randomUUID();
        CreditCard card = new CreditCard();
        card.setName("Visa");

        when(repository.findById(id)).thenReturn(Optional.of(card));
        when(repository.save(card)).thenReturn(card);
        when(mapper.toDto(card)).thenReturn(new CreditCardResponseDTO(id, "Visa", UUID.randomUUID()));

        service.updatePartial(id, Map.of("ignored", "value"));

        assertEquals("Visa", card.getName());
    }

    @Test
    void shouldRejectPartialUpdateWhenUserDoesNotExist() {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(new CreditCard()));
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                service.updatePartial(id, Map.of("userId", userId.toString())));
    }

    @Test
    void shouldThrowWhenPartialUpdatingMissingCard() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.updatePartial(id, Map.of("name", "Novo")));
    }

    @Test
    void shouldDeleteCard() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(true);

        service.delete(id);

        verify(repository).deleteById(id);
    }

    @Test
    void shouldRejectDeletingMissingCard() {
        UUID id = UUID.randomUUID();
        when(repository.existsById(id)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.delete(id));
    }
}
