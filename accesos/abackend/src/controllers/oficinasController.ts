import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { Prisma } from '@prisma/client';

// GET /api/oficinas
export const obtenerOficinas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const oficinas = await prisma.oficinas.findMany({
      select: { id: true, nombre: true, region: true }
    });
    res.status(200).json(oficinas);
  } catch (error) {
    console.error('❌ Error al obtener oficinas:', error);
    res.status(500).json({ error: 'Error al obtener oficinas' });
  }
};

// POST /api/oficinas
export const crearOficina = async (req: Request<{}, {}, { nombre: string, region?: string }>, res: Response): Promise<void> => {
  const { nombre, region } = req.body;

  if (!nombre) {
    res.status(400).json({ error: 'El nombre es obligatorio' });
    return;
  }

  try {
    const nueva = await prisma.oficinas.create({ data: { nombre, region } });
    res.status(201).json(nueva);
  } catch (error) {
    console.error('❌ Error al crear oficina:', error);
    res.status(500).json({ error: 'Error al crear oficina' });
  }
};

// PUT /api/oficinas/:id
export const actualizarOficina = async (
  req: Request<{ id: string }, {}, { nombre?: string; region?: string }>,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const { nombre, region } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  try {
    const actualizada = await prisma.oficinas.update({
      where: { id },
      data: {
        ...(nombre && { nombre }),
        ...(region && { region }),
      }
    });

    res.status(200).json(actualizada);
  } catch (error) {
    console.error('❌ Error al actualizar oficina:', error);
    res.status(500).json({ error: 'Error al actualizar oficina' });
  }
};
