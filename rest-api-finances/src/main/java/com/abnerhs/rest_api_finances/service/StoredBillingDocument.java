package com.abnerhs.rest_api_finances.service;

import java.io.InputStream;

public record StoredBillingDocument(
        InputStream inputStream,
        String fileName,
        String mimeType
) {}
