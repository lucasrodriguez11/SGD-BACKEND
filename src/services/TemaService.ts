import { TemaModel } from '@/database/models/Tema';
import { createLogger } from '@/logger';

const logger = createLogger('TemaService');

const DEFAULT_TEMAS = [
    'BARRIDO',
    'DESMALEZAMIENTO',
    'INSPECCION',
    'PODA',
    'CORTE AL RAS',
    'LIMPIEZA',
    'REPARACION',
    'PLANTINES/ARBOL',
    'COLABORACION - DONACION',
    'EVENTOS',
    'RRHH',
    'PODA',
    'LIMPIEZA',
    'BACHEO',
    'ZANJA',
    'OTROS',
];

export class TemaService {
    static async listActivos() {
        return await TemaModel.find({ activo: true }).sort({ nombre: 1 }).lean();
    }

    static async listAll() {
        return await TemaModel.find({}).sort({ nombre: 1 }).lean();
    }

    static async create(nombre: string) {
        const tema = await TemaModel.create({ nombre: nombre.toUpperCase() });
        logger.info({ id: tema._id, nombre: tema.nombre }, 'Tema creado');
        return tema;
    }

    static async update(id: string, data: { nombre?: string; activo?: boolean }) {
        const update: Record<string, unknown> = {};
        if (typeof data.nombre === 'string') update.nombre = data.nombre.toUpperCase();
        if (typeof data.activo === 'boolean') update.activo = data.activo;
        const tema = await TemaModel.findByIdAndUpdate(id, update, { new: true }).lean();
        return tema;
    }

    static async remove(id: string) {
        const tema = await TemaModel.findByIdAndDelete(id).lean();
        return tema;
    }

    static async seedDefaults(): Promise<void> {
        const count = await TemaModel.countDocuments({});
        if (count > 0) return;
        await TemaModel.insertMany(DEFAULT_TEMAS.map((n) => ({ nombre: n })));
        logger.info({ count: DEFAULT_TEMAS.length }, 'Temas por defecto sembrados');
    }
}


