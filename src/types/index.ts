/**
 * Shared types and interfaces for the application
 */

import { z } from 'zod';

/**
 * Expediente Types
 */
// Dynamic topics: validate as string (persisted catalog in DB)
export const TemaExpedienteEnum = z.string();

export const PrioridadEnum = z.enum(['Baja', 'Normal', 'Alta']);

export const EstadoExpedienteEnum = z.enum(['RECEPCIONADO', 'ENVIADO', 'ARCHIVADO']);

export type TemaExpediente = z.infer<typeof TemaExpedienteEnum>;
export type Prioridad = z.infer<typeof PrioridadEnum>;
export type EstadoExpediente = z.infer<typeof EstadoExpedienteEnum>;

/**
 * Expediente Interface
 */
export interface IExpediente {
  _id?: string;
  numeroExpediente: string;
  iniciador: string;
  tema: TemaExpediente;
  prioridad: Prioridad;
  extracto?: string;
  fojas: number;
  despachoActual: string;
  fechaIngreso: Date;
  fechaVencimiento?: Date;
  estado: EstadoExpediente;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Movimiento Interface
 */
export interface IMovimiento {
  _id?: string;
  expedienteId: string;
  despachoAnterior: string;
  despachoNuevo: string;
  fechaMovimiento: Date;
  fojasAgregadas: number;
  estado: EstadoExpediente;
  observaciones?: string;
  usuarioResponsable?: string;
  usuarioResponsableNombre?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Auth / User types
 */
export const UserRoleEnum = z.enum(['ADMIN', 'USER']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  passwordHash: string;
  despachoId?: string;
  role: UserRole;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Filter params for Expediente
 */
export interface ExpedienteFilterParams {
  numeroExpediente?: string;
  prioridad?: Prioridad;
  tema?: TemaExpediente;
  iniciador?: string;
  despachoActual?: string;
  estado?: EstadoExpediente;
}
