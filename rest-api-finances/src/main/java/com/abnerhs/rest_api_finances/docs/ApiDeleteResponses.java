package com.abnerhs.rest_api_finances.docs;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@StandardApiResponses
@ApiResponse(responseCode = "204", description = "Deleted", content = @Content)
public @interface ApiDeleteResponses {}