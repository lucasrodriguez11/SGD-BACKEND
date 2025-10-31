/**
 * Despacho Zod validators for API endpoints
 */

import { z } from 'zod';
import { TipoDespachoEnum, EstadoDespachoEnum } from '@/types/despacho';

/**
 * Despacho validators
 */
export const createDespachoSchema = z.object({
    nombre: z
        .string()
        .min(3, 'Nombre debe tener al menos 3 caracteres')
        .max(200, 'Nombre muy largo')
        .trim(),
    codigo: z
        .string()
        .min(2, 'Código debe tener al menos 2 caracteres')
        .max(20, 'Código muy largo')
        .trim()
        .toUpperCase(),
    tipo: TipoDespachoEnum,
    descripcion: z.string().max(500, 'Descripción muy larga').trim().optional(),
    responsable: z.string().max(200, 'Responsable muy largo').trim().optional(),
    email: z.string().email('Email inválido').toLowerCase().optional(),
    telefono: z.string().max(30, 'Teléfono muy largo').trim().optional(),
    estado: EstadoDespachoEnum.default('ACTIVO'),
});

export const updateDespachoSchema = createDespachoSchema.partial();

export const listDespachosSchema = z.object({
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
    tipo: TipoDespachoEnum.optional(),
    estado: EstadoDespachoEnum.optional(),
    search: z.string().optional(),
});



