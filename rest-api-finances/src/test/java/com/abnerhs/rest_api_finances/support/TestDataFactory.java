package com.abnerhs.rest_api_finances.support;

import com.abnerhs.rest_api_finances.dto.AuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.AuthenticationResponseDTO;
import com.abnerhs.rest_api_finances.dto.CategorySpendingDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardInvoiceResponseDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardRequestDTO;
import com.abnerhs.rest_api_finances.dto.CreditCardResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPeriodResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanInvitationResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanInviteLinkResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanParticipantResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanRequestDTO;
import com.abnerhs.rest_api_finances.dto.FinancialPlanResponseDTO;
import com.abnerhs.rest_api_finances.dto.FinancialSummaryDTO;
import com.abnerhs.rest_api_finances.dto.GoogleAuthenticationRequestDTO;
import com.abnerhs.rest_api_finances.dto.RecurringTransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.RegisterRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryDTO;
import com.abnerhs.rest_api_finances.dto.TransactionCategoryRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionRequestDTO;
import com.abnerhs.rest_api_finances.dto.TransactionResponseDTO;
import com.abnerhs.rest_api_finances.dto.UserPasswordUpdateDTO;
import com.abnerhs.rest_api_finances.dto.UserRequestDTO;
import com.abnerhs.rest_api_finances.dto.UserResponseDTO;
import com.abnerhs.rest_api_finances.dto.UserUpdateDTO;
import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.model.enums.TransactionType;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.Link;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static User currentUser() {
        User user = new User("john@example.com", "encoded-password", "John");
        user.setId(uuid("00000000-0000-0000-0000-000000000001"));
        return user;
    }

    public static User partnerUser() {
        User user = new User("mary@example.com", "encoded-password", "Mary");
        user.setId(uuid("00000000-0000-0000-0000-000000000002"));
        return user;
    }

    public static UserRequestDTO userRequest() {
        return new UserRequestDTO("John", "john@example.com", "secret123");
    }

    public static UserUpdateDTO userUpdate() {
        return new UserUpdateDTO("John Updated", "john.updated@example.com");
    }

    public static UserPasswordUpdateDTO userPasswordUpdate() {
        return new UserPasswordUpdateDTO("secret123", "new-secret");
    }

    public static UserResponseDTO userResponse() {
        return new UserResponseDTO(uuid("00000000-0000-0000-0000-000000000001"), "John", "john@example.com");
    }

    public static RegisterRequestDTO registerRequest() {
        return new RegisterRequestDTO("John", "john@example.com", "secret123");
    }

    public static AuthenticationRequestDTO authenticationRequest() {
        return new AuthenticationRequestDTO("john@example.com", "secret123");
    }

    public static AuthenticationResponseDTO authenticationResponse() {
        return new AuthenticationResponseDTO("access-token", "refresh-token", userResponse());
    }

    public static GoogleAuthenticationRequestDTO googleAuthenticationRequest() {
        return new GoogleAuthenticationRequestDTO("google-auth-code");
    }

    public static CreditCardRequestDTO creditCardRequest() {
        return new CreditCardRequestDTO("Visa", userResponse().id());
    }

    public static CreditCardResponseDTO creditCardResponse() {
        return new CreditCardResponseDTO(uuid("00000000-0000-0000-0000-000000000010"), "Visa", userResponse().id());
    }

    public static CreditCardInvoiceRequestDTO creditCardInvoiceRequest() {
        return new CreditCardInvoiceRequestDTO(creditCardResponse().id(), financialPeriodResponse().id(), new BigDecimal("500.00"));
    }

    public static CreditCardInvoiceResponseDTO creditCardInvoiceResponse() {
        return new CreditCardInvoiceResponseDTO(
                uuid("00000000-0000-0000-0000-000000000020"),
                creditCardResponse().id(),
                creditCardResponse().name(),
                financialPeriodResponse().id(),
                new BigDecimal("500.00")
        );
    }

    public static FinancialPlanRequestDTO financialPlanRequest() {
        return new FinancialPlanRequestDTO("Plano Casa");
    }

    public static FinancialPlanResponseDTO financialPlanResponse() {
        return new FinancialPlanResponseDTO(
                uuid("00000000-0000-0000-0000-000000000030"),
                "Plano Casa",
                userResponse().id(),
                List.of(partnerUser().getId())
        );
    }

    public static FinancialPlanParticipantResponseDTO ownerParticipantResponse() {
        return new FinancialPlanParticipantResponseDTO(
                userResponse().id(),
                userResponse().name(),
                userResponse().email(),
                "OWNER"
        );
    }

    public static FinancialPlanParticipantResponseDTO partnerParticipantResponse() {
        return new FinancialPlanParticipantResponseDTO(
                partnerUser().getId(),
                partnerUser().getName(),
                partnerUser().getEmail(),
                "PARTNER"
        );
    }

    public static FinancialPlanInviteLinkResponseDTO financialPlanInviteLinkResponse() {
        return new FinancialPlanInviteLinkResponseDTO(
                financialPlanResponse().id(),
                financialPlanResponse().name(),
                "invite-token",
                true
        );
    }

    public static FinancialPlanInvitationResponseDTO financialPlanInvitationResponse() {
        return new FinancialPlanInvitationResponseDTO(
                financialPlanResponse().id(),
                financialPlanResponse().name(),
                userResponse().id(),
                userResponse().name(),
                userResponse().email(),
                false,
                false
        );
    }

    public static FinancialPeriodRequestDTO financialPeriodRequest() {
        return new FinancialPeriodRequestDTO(3, 2026, financialPlanResponse().id());
    }

    public static FinancialPeriodResponseDTO financialPeriodResponse() {
        return new FinancialPeriodResponseDTO(uuid("00000000-0000-0000-0000-000000000040"), 3, 2026, new BigDecimal("900.00"), financialPlanResponse().id());
    }

    public static FinancialSummaryDTO financialSummary() {
        return new FinancialSummaryDTO(new BigDecimal("2000.00"), new BigDecimal("1100.00"), new BigDecimal("900.00"));
    }

    public static TransactionCategoryRequestDTO transactionCategoryRequest() {
        return new TransactionCategoryRequestDTO("Casa");
    }

    public static TransactionCategoryDTO transactionCategoryResponse() {
        return new TransactionCategoryDTO(uuid("00000000-0000-0000-0000-000000000050"), "Casa");
    }

    public static TransactionRequestDTO transactionRequest() {
        return new TransactionRequestDTO(
                "Supermercado",
                new BigDecimal("120.00"),
                TransactionType.EXPENSE,
                financialPeriodResponse().id(),
                userResponse().id(),
                transactionCategoryResponse(),
                1,
                null,
                creditCardInvoiceResponse().id(),
                true
        );
    }

    public static RecurringTransactionRequestDTO recurringTransactionRequest() {
        return new RecurringTransactionRequestDTO(transactionRequest(), 3);
    }

    public static TransactionResponseDTO transactionResponse() {
        return new TransactionResponseDTO(
                uuid("00000000-0000-0000-0000-000000000060"),
                "Supermercado",
                new BigDecimal("120.00"),
                LocalDateTime.of(2026, 3, 10, 8, 0, 0),
                TransactionType.EXPENSE,
                transactionCategoryResponse(),
                financialPeriodResponse().id(),
                userResponse().id(),
                1,
                uuid("00000000-0000-0000-0000-000000000061"),
                creditCardInvoiceResponse().id(),
                true
        );
    }

    public static CategorySpendingDTO categorySpending() {
        return new CategorySpendingDTO("Casa", new BigDecimal("120.00"));
    }

    public static <T> EntityModel<T> entityModel(T content, String selfHref) {
        return EntityModel.of(content, Link.of(selfHref).withSelfRel());
    }

    public static <T> CollectionModel<EntityModel<T>> collectionModel(List<EntityModel<T>> content, String selfHref) {
        return CollectionModel.of(content, Link.of(selfHref).withSelfRel());
    }

    private static UUID uuid(String value) {
        return UUID.fromString(value);
    }
}
