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

      // Create movement record (normalizar nombres de despacho con trim para consistencia)
      const movimiento = new MovimientoModel({
        expedienteId: data.expedienteId,
        despachoAnterior: expediente.despachoActual.trim(),
        despachoNuevo: data.despachoNuevo.trim(),
        fojasAgregadas: data.fojasAgregadas || 0,
        estado: data.estado,
        observaciones: data.observaciones,
        usuarioResponsable: data.usuarioResponsable,
      });

      await movimiento.save({ session });

      // Update expediente - NO cambiar despachoActual hasta confirmar recepción
      // Solo actualizar fojas y estado a ENVIADO
      expediente.fojas += data.fojasAgregadas || 0;
      expediente.estado = 'ENVIADO'; // Siempre ENVIADO cuando se crea un movimiento

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

      // Lookup despacho ID for websocket channel
      let despachoDestinoId: string | undefined;
      try {
        const { DespachoModel } = await import('@/database/models/Despacho');
        const desp = await DespachoModel.findOne({
          nombre: { $regex: new RegExp(`^${data.despachoNuevo.trim()}$`, 'i') }
        }).lean().exec();
        if (desp) despachoDestinoId = desp._id.toString();
      } catch { /* ignore lookup error */ }

      // Emit realtime notification
      void NotificationService.push({
        type: 'NUEVO_MOVIMIENTO',
        message: `Expediente ${expediente.numeroExpediente} enviado a ${data.despachoNuevo}`,
        expedienteId: expediente._id?.toString(),
        orgTargetId: despachoDestinoId || data.despachoNuevo, // Use ID if found
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
      // Ordenar por fecha ascendente (más antiguo primero) para mostrar el historial completo en orden cronológico
      const movimientos = await MovimientoModel.find({
        expedienteId,
        estado: { $ne: 'RECHAZADO' } // Excluir movimientos rechazados del historial oficial
      })
        .sort({ fechaMovimiento: 1 }) // Cambiado a 1 (ascendente) para orden cronológico
        .lean()
        .exec();

      // Populate usuarioResponsableNombre
      const { UserModel } = await import('@/database/models/User');
      const enriched = await Promise.all(
        movimientos.map(async (mov: any) => {
          let nombre = mov.usuarioResponsable; // Default to stored value (might be name)

          // If it looks like an ObjectId, try to fetch the name
          if (mov.usuarioResponsable && /^[0-9a-fA-F]{24}$/.test(mov.usuarioResponsable)) {
            try {
              const user = await UserModel.findById(mov.usuarioResponsable).lean().exec();
              if (user) {
                nombre = user.name;
              }
            } catch (e) {
              // Ignore error, keep original value
            }
          }
          return { ...mov, usuarioResponsableNombre: nombre };
        })
      );

      logger.info(
        { expedienteId, count: movimientos.length },
        'Movement history retrieved'
      );

      return enriched as IMovimiento[];
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

      if (!movimiento) return null;

      let nombre = movimiento.usuarioResponsable; // Default to stored value
      if (movimiento.usuarioResponsable && /^[0-9a-fA-F]{24}$/.test(movimiento.usuarioResponsable)) {
        try {
          const { UserModel } = await import('@/database/models/User');
          const user = await UserModel.findById(movimiento.usuarioResponsable).lean().exec();
          if (user) {
            nombre = user.name;
          }
        } catch (e) {
          // Ignore error
        }
      }

      return { ...movimiento, usuarioResponsableNombre: nombre } as IMovimiento;
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
        .lean()
        .exec();

      // Enriquecer con numeroExpediente
      const enriched = await Promise.all(
        movimientos.map(async (mov: any) => {
          const expediente = await ExpedienteModel.findById(mov.expedienteId).lean().exec();
          return {
            ...mov,
            expedienteId: {
              _id: mov.expedienteId,
              numeroExpediente: expediente?.numeroExpediente ?? mov.expedienteId,
            },
          };
        })
      );

      return enriched as IMovimiento[];
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
      const { ExpedienteModel } = await import('@/database/models/Expediente');
      const despacho = await DespachoModel.findById(despachoId).lean().exec();
      if (!despacho) throw new Error('Despacho no encontrado');

      const movimientos = await MovimientoModel.find({
        despachoAnterior: despacho.nombre.trim(),
        estado: 'ENVIADO',
      })
        .sort({ fechaMovimiento: -1 })
        .limit(limit)
        .lean()
        .exec();

      // Enriquecer con numeroExpediente
      const enriched = await Promise.all(
        movimientos.map(async (mov: any) => {
          const expediente = await ExpedienteModel.findById(mov.expedienteId).lean().exec();
          return {
            ...mov,
            expedienteId: {
              _id: mov.expedienteId,
              numeroExpediente: expediente?.numeroExpediente ?? mov.expedienteId,
            },
          };
        })
      );

      logger.info({ despachoId, despachoNombre: despacho.nombre, count: enriched.length }, 'Enviados by despacho retrieved');
      return enriched as IMovimiento[];
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
      const { ExpedienteModel } = await import('@/database/models/Expediente');
      const despacho = await DespachoModel.findById(despachoId).lean().exec();
      if (!despacho) throw new Error('Despacho no encontrado');

      const movimientos = await MovimientoModel.find({
        despachoNuevo: despacho.nombre.trim(),
        estado: 'RECEPCIONADO',
      })
        .sort({ fechaMovimiento: -1 })
        .limit(limit)
        .lean()
        .exec();

      // Enriquecer con numeroExpediente
      const enriched = await Promise.all(
        movimientos.map(async (mov: any) => {
          const expediente = await ExpedienteModel.findById(mov.expedienteId).lean().exec();
          return {
            ...mov,
            expedienteId: {
              _id: mov.expedienteId,
              numeroExpediente: expediente?.numeroExpediente ?? mov.expedienteId,
            },
          };
        })
      );

      logger.info({ despachoId, despachoNombre: despacho.nombre, count: enriched.length }, 'Recepcionados by despacho retrieved');
      return enriched as IMovimiento[];
    } catch (error) {
      logger.error({ error, despachoId }, 'Error getting recepcionados by despacho');
      throw new Error('Error al obtener movimientos recepcionados');
    }
  }
}
