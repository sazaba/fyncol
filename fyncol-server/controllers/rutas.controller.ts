import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crearRuta = async (req: Request, res: Response) => {
  try {
    const { country, city, currency, assignedToId } = req.body;
    
    const nuevaRuta = await prisma.route.create({
      data: {
        country,
        city,
        currency,
        assignedToId: assignedToId ? Number(assignedToId) : null,
      },
      include: { assignedTo: true }
    });
    
    res.status(201).json(nuevaRuta);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la ruta' });
  }
};

export const obtenerRutas = async (req: Request, res: Response) => {
  try {
    const rutas = await prisma.route.findMany({
      include: {
        assignedTo: {
          select: { id: true, name: true, role: true }
        }
      }
    });
    res.json(rutas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las rutas' });
  }
};

export const reasignarRuta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const rutaActualizada = await prisma.route.update({
      where: { id: Number(id) },
      data: { assignedToId: Number(assignedToId) },
      include: { assignedTo: true }
    });

    res.json(rutaActualizada);
  } catch (error) {
    res.status(500).json({ error: 'Error al reasignar la ruta' });
  }
};