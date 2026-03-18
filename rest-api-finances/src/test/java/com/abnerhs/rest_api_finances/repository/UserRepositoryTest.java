package com.abnerhs.rest_api_finances.repository;

import com.abnerhs.rest_api_finances.model.User;
import com.abnerhs.rest_api_finances.model.enums.AuthProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserRepositoryTest {

    @Autowired
    private UserRepository repository;

    @Test
    void shouldPersistGoogleLinkOnExistingUser() {
        User user = new User("john@example.com", "encoded-password", "John");
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setGoogleSubject("google-subject");
        user.setEmailVerified(true);

        User saved = repository.saveAndFlush(user);

        assertTrue(repository.findByGoogleSubject("google-subject").isPresent());
        assertEquals(AuthProvider.GOOGLE, saved.getAuthProvider());
    }

    @Test
    void shouldEnforceUniqueGoogleSubject() {
        User first = new User("john@example.com", "encoded-password", "John");
        first.setAuthProvider(AuthProvider.GOOGLE);
        first.setGoogleSubject("google-subject");
        first.setEmailVerified(true);
        repository.saveAndFlush(first);

        User second = new User("mary@example.com", "encoded-password", "Mary");
        second.setAuthProvider(AuthProvider.GOOGLE);
        second.setGoogleSubject("google-subject");
        second.setEmailVerified(true);

        assertThrows(DataIntegrityViolationException.class, () -> repository.saveAndFlush(second));
    }
}
