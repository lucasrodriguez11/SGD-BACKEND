/**
 * Zod validators for API endpoints
 */

import { z } from 'zod';
import { PrioridadEnum, EstadoExpedienteEnum } from '@/types';

/**
 * Expediente validators
 */
export const createExpedienteSchema = z.object({
  numeroExpediente: z
    .string()
    .min(1, 'Número de expediente es requerido')
    .max(50, 'Número de expediente muy largo')
    .trim()
    .toUpperCase(),
  iniciador: z
    .string()
    .min(3, 'Iniciador debe tener al menos 3 caracteres')
    .max(200, 'Iniciador muy largo')
    .trim(),
  tema: z.string().min(2).trim().toUpperCase(),
  prioridad: PrioridadEnum.default('Normal'),
  extracto: z.string().max(1000, 'Extracto muy largo').trim().optional(),
  fojas: z.coerce.number().int().min(0, 'Fojas no puede ser negativo').default(0),
  despachoActual: z
    .string()
    .min(3, 'Despacho actual debe tener al menos 3 caracteres')
    .max(200, 'Despacho actual muy largo')
    .trim(),
  fechaVencimiento: z.coerce.date().optional(),
  estado: EstadoExpedienteEnum.default('RECEPCIONADO'),
});

export const updateExpedienteSchema = createExpedienteSchema.partial();

export const listExpedientesSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page debe ser mayor a 0')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100, 'Limit no puede ser mayor a 100')),
  numeroExpediente: z.string().optional(),
  prioridad: PrioridadEnum.optional(),
  tema: z.string().optional(),
  iniciador: z.string().optional(),
  despachoActual: z.string().optional(),
  estado: EstadoExpedienteEnum.optional(),
});

/**
 * Movimiento validators
 */
export const createMovimientoSchema = z.object({
  expedienteId: z.string().min(1, 'ID de expediente es requerido'),
  despachoNuevo: z
    .string()
    .min(3, 'Despacho nuevo debe tener al menos 3 caracteres')
    .max(200, 'Despacho nuevo muy largo')
    .trim(),
  fojasAgregadas: z.coerce.number().int().min(0, 'Fojas agregadas no puede ser negativo').default(0),
  estado: EstadoExpedienteEnum,
  observaciones: z.string().max(500, 'Observaciones muy largas').trim().optional(),
  usuarioResponsable: z.string().trim().optional(),
});

/**
 * Generic validators
 */
export const mongoIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido'),
});

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100)),
});
