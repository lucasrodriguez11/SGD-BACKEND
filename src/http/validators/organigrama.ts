/**
 * Organigrama validators
 */

import { z } from 'zod';
import { DespachoTipoEnum } from '@/types/organigrama';

export const setParentSchema = z.object({
    despachoId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    parentId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .nullable()
        .optional(),
});

export const childrenQuerySchema = z.object({
    parentId: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .nullable()
        .optional(),
});

export const tipoSchema = z.object({ tipo: DespachoTipoEnum });





