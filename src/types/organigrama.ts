/**
 * Organigrama Types
 */

import { z } from 'zod';

// We reuse Despacho types semantically via string unions to avoid coupling
export const DespachoTipoEnum = z.enum([
    'DIRECCION',
    'SUBDIRECCIÓN',
    'AREA',
    'DEPARTAMENTO',
    'SECRETARIA',
]);

export type DespachoTipo = z.infer<typeof DespachoTipoEnum>;

/**
 * Allowed parent → child relationships
 * - Top-level: only DIRECCION (parent: null)
 */
export const ALLOWED_PARENT_TYPES: Record<DespachoTipo, Array<DespachoTipo | 'ROOT'>> = {
    DIRECCION: ['ROOT'],
    'SUBDIRECCIÓN': ['DIRECCION'],
    AREA: ['DIRECCION', 'SUBDIRECCIÓN'],
    DEPARTAMENTO: ['AREA', 'SUBDIRECCIÓN'],
    SECRETARIA: ['DEPARTAMENTO', 'AREA'],
};

/**
 * Organigrama edge (adjacency list): one parent per despacho
 */
export interface IOrganigrama {
    _id?: string;
    despachoId: string; // node
    parentId?: string | null; // null when root
    createdAt?: Date;
    updatedAt?: Date;
}





