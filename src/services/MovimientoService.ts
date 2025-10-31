/**
 * Movimiento Service
 * Business logic for Movimiento operations
 */

import { MovimientoModel, ExpedienteModel } from '@/database';
import type { IMovimiento } from '@/types';
import { createLogger } from '@/logger';
import mongoose from 'mongoose';
import { NotificationService } from './NotificationService';
import { RecepcionService } from './RecepcionService';

const logger = createLogger('MovimientoService');

export interface CreateMovimientoData {
  expedienteId: string;
  despachoNuevo: string;
  fojasAgregadas?: number;
  estado: 'RECEPCIONADO' | 'ENVIADO' | 'ARCHIVADO';
  observaciones?: string;
  usuarioResponsable?: string;
}

export class MovimientoService {
  /**
   * Register a new movement and update expediente
   * This is a transactional operation
   */
  static async registrarMovimiento(data: CreateMovimientoData): Promise<IMovimiento> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info(
        { expedienteId: data.expedienteId, despachoNuevo: data.despachoNuevo },
        'Registering movement'
      );

      // Find expediente
      const expediente = await ExpedienteModel.findById(data.expedienteId).session(
        session
      );

      if (!expediente) {
        throw new Error('Expediente no encontrado');
      }

      // Prevent sending to the same despacho
      if (expediente.despachoActual === data.despachoNuevo) {
        throw new Error('El despacho destino no puede ser igual al despacho actual del expediente');
      }

      // Create movement record
      const movimiento = new MovimientoModel({
        expedienteId: data.expedienteId,
        despachoAnterior: expediente.despachoActual,
        despachoNuevo: data.despachoNuevo,
        fojasAgregadas: data.fojasAgregadas || 0,
        estado: data.estado,
        observaciones: data.observaciones,
        usuarioResponsable: data.usuarioResponsable,
      });

      await movimiento.save({ session });

      // Update expediente
      expediente.despachoActual = data.despachoNuevo;
      expediente.fojas += data.fojasAgregadas || 0;
      expediente.estado = data.estado;

      await expediente.save({ session });

      // Commit transaction
      await session.commitTransaction();

      logger.info(
        {
          movimientoId: movimiento._id,
          expedienteId: data.expedienteId,
          from: movimiento.despachoAnterior,
          to: movimiento.despachoNuevo,
        },
        'Movement registered successfully'
      );

      // Emit realtime notification
      void NotificationService.push({
        type: 'NUEVO_MOVIMIENTO',
        message: `Expediente ${expediente.numeroExpediente} enviado a ${data.despachoNuevo}`,
        expedienteId: expediente._id?.toString(),
        orgTargetId: data.despachoNuevo,
        extra: { from: movimiento.despachoAnterior, to: movimiento.despachoNuevo },
      });

      // Create recepcion entry for destino
      void RecepcionService.createForMovimiento(expediente._id!.toString(), data.despachoNuevo);

      return movimiento.toObject();
    } catch (error: any) {
      // Rollback transaction on error
      await session.abortTransaction();
      logger.error({ error, data }, 'Error registering movement');
      throw new Error(error.message || 'Error al registrar el movimiento');
    } finally {
      session.endSession();
    }
  }

  /**
   * Get movement history for an expediente
   */
  static async getHistorial(expedienteId: string): Promise<IMovimiento[]> {
    try {
      const movimientos = await MovimientoModel.find({ expedienteId })
        .sort({ fechaMovimiento: -1 })
        .lean()
        .exec();

      logger.info(
        { expedienteId, count: movimientos.length },
        'Movement history retrieved'
      );

      return movimientos as IMovimiento[];
    } catch (error) {
      logger.error({ error, expedienteId }, 'Error getting movement history');
      throw new Error('Error al obtener el historial de movimientos');
    }
  }

  /**
   * Get latest movement for an expediente
   */
  static async getLatestMovimiento(expedienteId: string): Promise<IMovimiento | null> {
    try {
      const movimiento = await MovimientoModel.findOne({ expedienteId })
        .sort({ fechaMovimiento: -1 })
        .lean()
        .exec();

      return movimiento as IMovimiento | null;
    } catch (error) {
      logger.error({ error, expedienteId }, 'Error getting latest movement');
      throw new Error('Error al obtener el último movimiento');
    }
  }

  /**
   * Get movements by despacho
   */
  static async getByDespacho(
    despacho: string,
    limit: number = 50
  ): Promise<IMovimiento[]> {
    try {
      const movimientos = await MovimientoModel.find({
        $or: [{ despachoAnterior: despacho }, { despachoNuevo: despacho }],
      })
        .sort({ fechaMovimiento: -1 })
        .limit(limit)
        .lean()
        .exec();

      return movimientos as IMovimiento[];
    } catch (error) {
      logger.error({ error, despacho }, 'Error getting movements by despacho');
      throw new Error('Error al obtener movimientos por despacho');
    }
  }

  /**
   * Get movement statistics
   */
  static async getStatistics(despacho?: string): Promise<{
    total: number;
    recibidos: number;
    enviados: number;
    byEstado: Record<string, number>;
  }> {
    try {
      const query = despacho ? { despachoNuevo: despacho } : {};

      const [total, recibidos, enviados, byEstado] = await Promise.all([
        MovimientoModel.countDocuments(query),
        despacho
          ? MovimientoModel.countDocuments({
            despachoNuevo: despacho,
            estado: 'RECEPCIONADO',
          })
          : 0,
        despacho
          ? MovimientoModel.countDocuments({
            despachoAnterior: despacho,
            estado: 'ENVIADO',
          })
          : 0,
        MovimientoModel.aggregate([
          ...(despacho ? [{ $match: query }] : []),
          { $group: { _id: '$estado', count: { $sum: 1 } } },
        ]),
      ]);

      return {
        total,
        recibidos,
        enviados,
        byEstado: Object.fromEntries(byEstado.map((item) => [item._id, item.count])),
      };
    } catch (error) {
      logger.error({ error, despacho }, 'Error getting movement statistics');
      throw new Error('Error al obtener estadísticas de movimientos');
    }
  }

  /**
   * Get movements sent from a despacho (where despachoAnterior matches)
   */
  static async getEnviadosByDespacho(despachoId: string, limit: number = 50): Promise<IMovimiento[]> {
    try {
      // First get despacho nombre from ID
      const { DespachoModel } = await import('@/database/models/Despacho');
      const despacho = await DespachoModel.findById(despachoId).lean().exec();
      if (!despacho) throw new Error('Despacho no encontrado');

      const movimientos = await MovimientoModel.find({
        despachoAnterior: despacho.nombre,
        estado: 'ENVIADO',
      })
        .sort({ fechaMovimiento: -1 })
        .limit(limit)
        .lean()
        .exec();

      logger.info({ despachoId, despachoNombre: despacho.nombre, count: movimientos.length }, 'Enviados by despacho retrieved');
      return movimientos as IMovimiento[];
    } catch (error) {
      logger.error({ error, despachoId }, 'Error getting enviados by despacho');
      throw new Error('Error al obtener movimientos enviados');
    }
  }

  /**
   * Get movements received by a despacho (where despachoNuevo matches and estado is RECEPCIONADO)
   */
  static async getRecepcionadosByDespacho(despachoId: string, limit: number = 50): Promise<IMovimiento[]> {
    try {
      // First get despacho nombre from ID
      const { DespachoModel } = await import('@/database/models/Despacho');
      const despacho = await DespachoModel.findById(despachoId).lean().exec();
      if (!despacho) throw new Error('Despacho no encontrado');

      const movimientos = await MovimientoModel.find({
        despachoNuevo: despacho.nombre,
        estado: 'RECEPCIONADO',
      })
        .sort({ fechaMovimiento: -1 })
        .limit(limit)
        .lean()
        .exec();

      logger.info({ despachoId, despachoNombre: despacho.nombre, count: movimientos.length }, 'Recepcionados by despacho retrieved');
      return movimientos as IMovimiento[];
    } catch (error) {
      logger.error({ error, despachoId }, 'Error getting recepcionados by despacho');
      throw new Error('Error al obtener movimientos recepcionados');
    }
  }
}
