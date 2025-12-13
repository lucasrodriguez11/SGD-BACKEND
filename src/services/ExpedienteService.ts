/**
 * Expediente Service
 * Business logic for Expediente operations
 */

import { ExpedienteModel } from '@/database';
import type { IExpediente, ExpedienteFilterParams, PaginationParams } from '@/types';
import { createLogger } from '@/logger';
import { NotificationService } from './NotificationService';
import { wsHub } from './WebSocketHub';

const logger = createLogger('ExpedienteService');

export class ExpedienteService {
  /**
   * Create a new expediente
   */
  static async create(data: Partial<IExpediente> & { _userId?: string }): Promise<IExpediente> {
    try {
      logger.info({ numeroExpediente: data.numeroExpediente }, 'Creating expediente');

      const expediente = await ExpedienteModel.create(data);

      logger.info(
        { id: expediente._id, numeroExpediente: expediente.numeroExpediente },
        'Expediente created successfully'
      );

      const created = expediente.toObject();

      // Lookup despacho ID for websocket channel
      let despachoId: string | undefined;
      try {
        const { DespachoModel } = await import('@/database/models/Despacho');
        const desp = await DespachoModel.findOne({
          nombre: { $regex: new RegExp(`^${created.despachoActual.trim()}$`, 'i') }
        }).lean().exec();
        if (desp) despachoId = desp._id.toString();
      } catch { /* ignore lookup error */ }

      // Emit Notification + WS event for registro
      await NotificationService.push({
        type: 'EXPEDIENTE_REGISTRADO',
        message: `Expediente ${created.numeroExpediente} registrado en ${created.despachoActual}`,
        expedienteId: created._id as any,
        orgTargetId: despachoId || created.despachoActual, // Use ID if found
      }).catch(() => { });

      wsHub.broadcast('notifications', {
        type: 'EXPEDIENTE_REGISTRADO',
        entityId: created._id,
        numeroExpediente: created.numeroExpediente,
        despachoActual: created.despachoActual,
        fechaIngreso: created.fechaIngreso,
      });

      return created;
    } catch (error: any) {
      logger.error({ error, data }, 'Error creating expediente');
      throw new Error(
        error.code === 11000
          ? 'El número de expediente ya existe'
          : 'Error al crear el expediente'
      );
    }
  }

  /**
   * Find expedientes with filters and pagination
   */
  static async findAll(
    filters: ExpedienteFilterParams,
    pagination: PaginationParams
  ): Promise<{ expedientes: IExpediente[]; total: number; totalPages: number }> {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};

      if (filters.numeroExpediente) {
        query.numeroExpediente = new RegExp(filters.numeroExpediente, 'i');
      }
      if (filters.prioridad) {
        query.prioridad = filters.prioridad;
      }
      if (filters.tema) {
        query.tema = filters.tema;
      }
      if (filters.iniciador) {
        query.iniciador = new RegExp(filters.iniciador, 'i');
      }
      if (filters.despachoActual) {
        query.despachoActual = new RegExp(filters.despachoActual, 'i');
      }
      if (filters.estado) {
        query.estado = filters.estado;
      }

      // Execute queries in parallel
      const [expedientes, total] = await Promise.all([
        ExpedienteModel.find(query)
          .sort({ fechaIngreso: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        ExpedienteModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info({ filters, page, limit, total, totalPages }, 'Expedientes retrieved');

      return {
        expedientes: expedientes as IExpediente[],
        total,
        totalPages,
      };
    } catch (error) {
      logger.error({ error, filters, pagination }, 'Error finding expedientes');
      throw new Error('Error al buscar expedientes');
    }
  }

  /**
   * Find expediente by ID
   */
  static async findById(id: string): Promise<IExpediente | null> {
    try {
      const expediente = await ExpedienteModel.findById(id).lean().exec();

      if (!expediente) {
        logger.warn({ id }, 'Expediente not found');
        return null;
      }

      return expediente as IExpediente;
    } catch (error) {
      logger.error({ error, id }, 'Error finding expediente by ID');
      throw new Error('Error al buscar el expediente');
    }
  }

  /**
   * Find expediente by numero
   */
  static async findByNumero(numeroExpediente: string): Promise<IExpediente | null> {
    try {
      const expediente = await ExpedienteModel.findOne({ numeroExpediente })
        .lean()
        .exec();

      return expediente as IExpediente | null;
    } catch (error) {
      logger.error({ error, numeroExpediente }, 'Error finding expediente by numero');
      throw new Error('Error al buscar el expediente');
    }
  }

  /**
   * Update expediente
   */
  static async update(
    id: string,
    data: Partial<IExpediente>
  ): Promise<IExpediente | null> {
    try {
      logger.info({ id, data }, 'Updating expediente');

      const expediente = await ExpedienteModel.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();

      if (!expediente) {
        logger.warn({ id }, 'Expediente not found for update');
        return null;
      }

      logger.info({ id }, 'Expediente updated successfully');

      return expediente as IExpediente;
    } catch (error: any) {
      logger.error({ error, id, data }, 'Error updating expediente');
      throw new Error(
        error.code === 11000
          ? 'El número de expediente ya existe'
          : 'Error al actualizar el expediente'
      );
    }
  }

  /**
   * Delete expediente (soft delete - archive)
   */
  static async archive(id: string): Promise<IExpediente | null> {
    try {
      logger.info({ id }, 'Archiving expediente');

      const expediente = await ExpedienteModel.findByIdAndUpdate(
        id,
        { $set: { estado: 'ARCHIVADO' } },
        { new: true }
      )
        .lean()
        .exec();

      if (!expediente) {
        logger.warn({ id }, 'Expediente not found for archiving');
        return null;
      }

      logger.info({ id }, 'Expediente archived successfully');

      return expediente as IExpediente;
    } catch (error) {
      logger.error({ error, id }, 'Error archiving expediente');
      throw new Error('Error al archivar el expediente');
    }
  }

  /**
   * Delete expediente permanently (hard delete)
   * Also deletes related movimientos and recepciones
   */
  static async delete(id: string): Promise<boolean> {
    try {
      logger.info({ id }, 'Deleting expediente permanently');

      // Check if expediente exists
      const expediente = await ExpedienteModel.findById(id).lean().exec();
      if (!expediente) {
        logger.warn({ id }, 'Expediente not found for deletion');
        return false;
      }

      // Delete related movimientos
      const { MovimientoModel } = await import('@/database/models/Movimiento');
      await MovimientoModel.deleteMany({ expedienteId: id }).exec();
      logger.info({ id }, 'Related movimientos deleted');

      // Delete related recepciones
      const { RecepcionModel } = await import('./RecepcionService');
      await RecepcionModel.deleteMany({ expedienteId: id }).exec();
      logger.info({ id }, 'Related recepciones deleted');

      // Delete the expediente
      await ExpedienteModel.findByIdAndDelete(id).exec();
      logger.info({ id }, 'Expediente deleted permanently');

      return true;
    } catch (error) {
      logger.error({ error, id }, 'Error deleting expediente');
      throw new Error('Error al eliminar el expediente');
    }
  }

  /**
   * Get expedientes by despacho
   */
  static async findByDespacho(
    despacho: string,
    pagination: PaginationParams
  ): Promise<{ expedientes: IExpediente[]; total: number }> {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const [expedientes, total] = await Promise.all([
        ExpedienteModel.find({ despachoActual: despacho })
          .sort({ fechaIngreso: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        ExpedienteModel.countDocuments({ despachoActual: despacho }),
      ]);

      return {
        expedientes: expedientes as IExpediente[],
        total,
      };
    } catch (error) {
      logger.error({ error, despacho }, 'Error finding expedientes by despacho');
      throw new Error('Error al buscar expedientes por despacho');
    }
  }

  /**
   * Get statistics
   */
  static async getStatistics(): Promise<{
    total: number;
    byPrioridad: Record<string, number>;
    byEstado: Record<string, number>;
    byTema: Record<string, number>;
  }> {
    try {
      const [total, byPrioridad, byEstado, byTema] = await Promise.all([
        ExpedienteModel.countDocuments(),
        ExpedienteModel.aggregate([
          { $group: { _id: '$prioridad', count: { $sum: 1 } } },
        ]),
        ExpedienteModel.aggregate([{ $group: { _id: '$estado', count: { $sum: 1 } } }]),
        ExpedienteModel.aggregate([{ $group: { _id: '$tema', count: { $sum: 1 } } }]),
      ]);

      return {
        total,
        byPrioridad: Object.fromEntries(
          byPrioridad.map((item) => [item._id, item.count])
        ),
        byEstado: Object.fromEntries(byEstado.map((item) => [item._id, item.count])),
        byTema: Object.fromEntries(byTema.map((item) => [item._id, item.count])),
      };
    } catch (error) {
      logger.error({ error }, 'Error getting statistics');
      throw new Error('Error al obtener estadísticas');
    }
  }
}
