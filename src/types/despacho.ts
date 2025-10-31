/**
 * Despacho Types
 */

import { z } from 'zod';

export const TipoDespachoEnum = z.enum([
    'DIRECCION',
    'SUBDIRECCIÓN',
    'AREA',
    'DEPARTAMENTO',
    'SECRETARIA',
]);

export const EstadoDespachoEnum = z.enum(['ACTIVO', 'INACTIVO']);

export type TipoDespacho = z.infer<typeof TipoDespachoEnum>;
export type EstadoDespacho = z.infer<typeof EstadoDespachoEnum>;

/**
 * Despacho Interface
 */
export interface IDespacho {
    _id?: string;
    nombre: string;
    codigo: string;
    tipo: TipoDespacho;
    descripcion?: string;
    responsable?: string;
    email?: string;
    telefono?: string;
    estado: EstadoDespacho;
    createdAt?: Date;
    updatedAt?: Date;
}




