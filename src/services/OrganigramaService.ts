/**
 * Organigrama Service
 * Manages parent-child relationships between Despachos
 */

import { DespachoModel, OrganigramaModel } from '@/database/models';
import { logger } from '@/logger';
import { ALLOWED_PARENT_TYPES, type DespachoTipo } from '@/types/organigrama';

export class OrganigramaService {
    /**
     * Set or change parent for a despacho
     * - parentId null allowed only if child tipo is DIRECCION
     * - validates allowed parent-child types
     * - prevents cycles
     */
    static async setParent(
        despachoId: string,
        parentId: string | null
    ): Promise<{ despachoId: string; parentId: string | null }> {
        // Load child despacho
        const child = await DespachoModel.findById(despachoId);
        if (!child) throw new Error('Despacho (child) no encontrado');

        // Root rule: only DIRECCION can be root (parent null)
        if (!parentId) {
            if (child.tipo !== 'DIRECCION') {
                throw new Error('Solo DIRECCION puede estar en la raíz');
            }
        } else {
            // Load parent despacho
            const parent = await DespachoModel.findById(parentId);
            if (!parent) throw new Error('Despacho (parent) no encontrado');

            // Validate allowed parent types
            const allowedParents = ALLOWED_PARENT_TYPES[child.tipo as DespachoTipo];
            if (!allowedParents.includes(parent.tipo as DespachoTipo)) {
                throw new Error(
                    `${child.tipo} no puede depender de ${parent.tipo}. Padres válidos: ${allowedParents.join(', ')}`
                );
            }

            // Prevent cycles: parent cannot be a descendant of child
            const descendants = await OrganigramaService.getDescendants(despachoId);
            const isCycle = descendants.some((d) => d._id?.toString() === parentId);
            if (isCycle) {
                throw new Error('No se puede establecer un ciclo en el organigrama');
            }
        }

        // Upsert edge
        await OrganigramaModel.findOneAndUpdate(
            { despachoId },
            { parentId: parentId ?? null },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        logger.info({ despachoId, parentId }, 'Organigrama parent set');
        return { despachoId, parentId };
    }

    /**
     * Get direct children of a despacho
     * - If parentId null → top-level children are DIRECCION nodes (rarely used)
     */
    static async getChildren(parentId: string | null): Promise<any[]> {
        const edges = await OrganigramaModel.find({ parentId: parentId ?? null });
        const ids = edges.map((e) => e.despachoId);
        const nodes = await DespachoModel.find({ _id: { $in: ids } }).sort({ nombre: 1 });
        return nodes;
    }

    /**
     * Get ancestors path from node up to root
     */
    static async getAncestors(despachoId: string): Promise<any[]> {
        const path: any[] = [];
        let currentEdge = await OrganigramaModel.findOne({ despachoId });
        while (currentEdge?.parentId) {
            const parent = await DespachoModel.findById(currentEdge.parentId);
            if (!parent) break;
            path.push(parent);
            currentEdge = await OrganigramaModel.findOne({ despachoId: parent._id });
        }
        return path.reverse();
    }

    /**
     * Get all descendants (DFS)
     */
    static async getDescendants(despachoId: string): Promise<any[]> {
        const result: any[] = [];
        const stack: string[] = [despachoId];

        while (stack.length > 0) {
            const id = stack.pop() as string;
            const childrenEdges = await OrganigramaModel.find({ parentId: id });
            const childIds = childrenEdges.map((e) => e.despachoId.toString());
            if (childIds.length) {
                const childNodes = await DespachoModel.find({ _id: { $in: childIds } });
                result.push(...childNodes);
                stack.push(...childIds);
            }
        }
        return result;
    }

    /**
     * Get full tree (all roots and nested children)
     */
    static async getTree(): Promise<any[]> {
        // Roots are nodes with parentId null
        const rootEdges = await OrganigramaModel.find({ parentId: null });
        const rootIds = rootEdges.map((e) => e.despachoId);
        const roots = await DespachoModel.find({ _id: { $in: rootIds } }).sort({ nombre: 1 });

        const build = async (nodeId: string): Promise<any> => {
            const node = await DespachoModel.findById(nodeId);
            if (!node) return null;
            const children = await OrganigramaService.getChildren(nodeId);
            const childrenWithNest = await Promise.all(
                children.map(async (c) => build(c._id!.toString()))
            );
            return {
                _id: node._id,
                nombre: node.nombre,
                codigo: node.codigo,
                tipo: node.tipo,
                estado: node.estado,
                children: childrenWithNest.filter(Boolean),
            };
        };

        const tree = await Promise.all(roots.map((r) => build(r._id!.toString())));
        return tree.filter(Boolean);
    }
}






