package com.abnerhs.rest_api_finances.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalBillingDocumentStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("pdf", "png", "jpg", "jpeg", "webp");

    @Value("${app.transaction-documents.dir}")
    private String storageDirectory;

    private Path rootPath;

    @PostConstruct
    void init() throws IOException {
        rootPath = Path.of(storageDirectory).toAbsolutePath().normalize();
        Files.createDirectories(rootPath);
    }

    public StoredFileMetadata store(MultipartFile file) {
        validate(file);

        String originalFileName = sanitizeFileName(file.getOriginalFilename());
        String extension = resolveExtension(originalFileName);
        LocalDate today = LocalDate.now();
        String storageKey = Path.of(
                String.valueOf(today.getYear()),
                String.format("%02d", today.getMonthValue()),
                UUID.randomUUID() + "." + extension
        ).toString().replace('\\', '/');

        Path targetPath = rootPath.resolve(storageKey).normalize();
        if (!targetPath.startsWith(rootPath)) {
            throw new IllegalArgumentException("Arquivo inv\u00e1lido.");
        }

        try {
            Files.createDirectories(targetPath.getParent());
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("N\u00e3o foi poss\u00edvel salvar o documento.");
        }

        return new StoredFileMetadata(
                storageKey,
                originalFileName,
                resolveMimeType(file, extension)
        );
    }

    public StoredBillingDocument read(String storageKey, String fileName, String mimeType) {
        Path path = resolve(storageKey);

        try {
            return new StoredBillingDocument(Files.newInputStream(path), fileName, mimeType);
        } catch (IOException exception) {
            throw new IllegalStateException("N\u00e3o foi poss\u00edvel ler o documento.");
        }
    }

    public void delete(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }

        Path path = resolve(storageKey);
        try {
            Files.deleteIfExists(path);
            deleteEmptyParents(path.getParent());
        } catch (IOException exception) {
            throw new IllegalStateException("N\u00e3o foi poss\u00edvel remover o documento.");
        }
    }

    private void deleteEmptyParents(Path directory) throws IOException {
        while (directory != null && !directory.equals(rootPath)) {
            try {
                Files.delete(directory);
            } catch (IOException exception) {
                break;
            }
            directory = directory.getParent();
        }
    }

    private Path resolve(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IllegalArgumentException("Documento n\u00e3o encontrado.");
        }

        Path path = rootPath.resolve(storageKey).normalize();
        if (!path.startsWith(rootPath) || !Files.exists(path)) {
            throw new IllegalArgumentException("Documento n\u00e3o encontrado.");
        }
        return path;
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Selecione um arquivo para envio.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("O arquivo deve ter no m\u00e1ximo 10 MB.");
        }

        String fileName = sanitizeFileName(file.getOriginalFilename());
        String extension = resolveExtension(fileName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Tipo de arquivo n\u00e3o suportado.");
        }
    }

    private String sanitizeFileName(String fileName) {
        String resolved = fileName == null ? "documento" : Path.of(fileName).getFileName().toString().trim();
        if (resolved.isBlank()) {
            return "documento";
        }
        return resolved.replaceAll("[\\r\\n]", "_");
    }

    private String resolveExtension(String fileName) {
        int separatorIndex = fileName.lastIndexOf('.');
        if (separatorIndex < 0 || separatorIndex == fileName.length() - 1) {
            throw new IllegalArgumentException("Tipo de arquivo n\u00e3o suportado.");
        }

        return fileName.substring(separatorIndex + 1).toLowerCase(Locale.ROOT);
    }

    private String resolveMimeType(MultipartFile file, String extension) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            return contentType;
        }

        return switch (extension) {
            case "pdf" -> "application/pdf";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }

    public record StoredFileMetadata(
            String storageKey,
            String fileName,
            String mimeType
    ) {}
}
