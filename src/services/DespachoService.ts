/**
 * Despacho Service
 * Business logic for Despacho operations
 */

import { DespachoModel } from '@/database/models';
import type { IDespacho } from '@/types/despacho';
import { logger } from '@/logger';

export class DespachoService {
    /**
     * Create a new despacho
     */
    static async create(data: Partial<IDespacho>): Promise<IDespacho> {
        logger.info({ codigo: data.codigo, nombre: data.nombre }, 'Creating despacho');

        // Check if codigo already exists
        const exists = await DespachoModel.findOne({ codigo: data.codigo });
        if (exists) {
            throw new Error(`Despacho con código ${data.codigo} ya existe`);
        }

        const despacho = await DespachoModel.create(data);

        logger.info(
            { id: despacho._id, codigo: despacho.codigo, nombre: despacho.nombre },
            'Despacho created successfully'
        );

        return despacho;
    }

    /**
     * List all despachos with filters and pagination
     */
    static async list(params: {
        page?: number;
        limit?: number;
        tipo?: string;
        estado?: string;
        search?: string;
    }): Promise<{ despachos: IDespacho[]; pagination: any }> {
        const { page = 1, limit = 10, tipo, estado, search } = params;

        // Build query
        const query: any = {};

        if (tipo) query.tipo = tipo;
        if (estado) query.estado = estado;
        if (search) {
            query.$or = [
                { nombre: { $regex: search, $options: 'i' } },
                { codigo: { $regex: search, $options: 'i' } },
                { responsable: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const total = await DespachoModel.countDocuments(query);

        const despachos = await DespachoModel.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ nombre: 1 });

        const totalPages = Math.ceil(total / limit);

        logger.info(
            { page, limit, total, totalPages },
            'Despachos retrieved'
        );

        return {
            despachos,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }

    /**
     * Get despacho by ID
     */
    static async getById(id: string): Promise<IDespacho | null> {
        logger.info({ id }, 'Getting despacho by ID');

        const despacho = await DespachoModel.findById(id);

        if (!despacho) {
            logger.warn({ id }, 'Despacho not found');
            return null;
        }

        return despacho;
    }

    /**
     * Get despacho by codigo
     */
    static async getByCodigo(codigo: string): Promise<IDespacho | null> {
        logger.info({ codigo }, 'Getting despacho by codigo');

        const despacho = await DespachoModel.findOne({ codigo: codigo.toUpperCase() });

        if (!despacho) {
            logger.warn({ codigo }, 'Despacho not found');
            return null;
        }

        return despacho;
    }

    /**
     * Update despacho
     */
    static async update(id: string, data: Partial<IDespacho>): Promise<IDespacho | null> {
        logger.info({ id, data }, 'Updating despacho');

        // If updating codigo, check it doesn't exist
        if (data.codigo) {
            const exists = await DespachoModel.findOne({
                codigo: data.codigo,
                _id: { $ne: id },
            });
            if (exists) {
                throw new Error(`Despacho con código ${data.codigo} ya existe`);
            }
        }

        const despacho = await DespachoModel.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });

        if (!despacho) {
            logger.warn({ id }, 'Despacho not found for update');
            return null;
        }

        logger.info({ id }, 'Despacho updated successfully');

        return despacho;
    }

    /**
     * Delete despacho (set to INACTIVO)
     */
    static async delete(id: string): Promise<IDespacho | null> {
        logger.info({ id }, 'Deactivating despacho');

        const despacho = await DespachoModel.findByIdAndUpdate(
            id,
            { estado: 'INACTIVO' },
            { new: true }
        );

        if (!despacho) {
            logger.warn({ id }, 'Despacho not found for deactivation');
            return null;
        }

        logger.info({ id }, 'Despacho deactivated successfully');

        return despacho;
    }

    /**
     * Get all active despachos (for dropdowns)
     */
    static async getActivos(): Promise<IDespacho[]> {
        const despachos = await DespachoModel.find({ estado: 'ACTIVO' }).sort({
            nombre: 1,
        });

        logger.info({ count: despachos.length }, 'Active despachos retrieved');

        return despachos;
    }
}




