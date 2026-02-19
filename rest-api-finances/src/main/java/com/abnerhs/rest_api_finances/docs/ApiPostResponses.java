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
@ApiResponse(responseCode = "201", description = "Created")
@ApiResponse(responseCode = "400", description = "Bad Request", content = @Content)
@ApiResponse(responseCode = "422", description = "Unprocessable Content", content = @Content)
public @interface ApiPostResponses {}