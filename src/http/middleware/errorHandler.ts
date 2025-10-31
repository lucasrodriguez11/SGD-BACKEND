/**
 * Error handling middleware
 */

import type { Context } from 'hono';
import { createLogger } from '@/logger';
import type { ApiResponse } from '@/types';

const logger = createLogger('ErrorHandler');

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
    c: Context,
    error: AppError,
    statusCode: number = 500
): Response {
    const response: ApiResponse = {
        success: false,
        error: {
            message: error.message || 'Error interno del servidor',
            code: error.code,
            details: error.details,
        },
    };

    // Log error
    logger.error(
        {
            error: {
                message: error.message,
                stack: error.stack,
                statusCode,
                code: error.code,
            },
            request: {
                method: c.req.method,
                path: c.req.path,
                query: c.req.query(),
            },
        },
        'Request error'
    );

    // Type assertion for Hono's StatusCode
    return c.json(response, statusCode as any);
}

/**
 * Global error handler
 */
export async function errorHandler(err: Error, c: Context): Promise<Response> {
    const error = err as AppError;

    // Handle validation errors
    if (error.name === 'ZodError') {
        return createErrorResponse(
            c,
            {
                ...error,
                message: 'Error de validación',
                code: 'VALIDATION_ERROR',
            },
            400
        );
    }

    // Handle MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        return createErrorResponse(
            c,
            {
                ...error,
                message: 'Error de base de datos',
                code: 'DATABASE_ERROR',
            },
            500
        );
    }

    // Handle custom status codes
    const statusCode = error.statusCode || 500;

    return createErrorResponse(c, error, statusCode);
}

/**
 * Not found handler
 */
export function notFoundHandler(c: Context): Response {
    const response: ApiResponse = {
        success: false,
        error: {
            message: 'Ruta no encontrada',
            code: 'NOT_FOUND',
        },
    };

    return c.json(response, 404);
}

/**
 * Create app error
 */
export function createAppError(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
): AppError {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
}
