import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// GET /api/permisos
export const obtenerPermisos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const permisos = await prisma.permiso.findMany();
    res.json(permisos);
  } catch (error) {
    console.error('❌ Error al obtener permisos:', error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};

