import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const cameraSchema = z.object({
  name: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  sensorWidthMm: z.number().positive(),
  sensorHeightMm: z.number().positive(),
  resolutionX: z.number().int().positive(),
  resolutionY: z.number().int().positive(),
  pixelSizeUm: z.number().positive(),
  sensorType: z.string().max(50),
  notes: z.string().optional(),
});

const updateCameraSchema = cameraSchema.partial();

export default async function camerasRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all user's cameras
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const cameras = await prisma.camera.findMany({
      where: { userId: request.user!.userId },
      orderBy: { name: 'asc' },
    });

    return reply.send(cameras);
  });

  // Get single camera
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const camera = await prisma.camera.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.userId,
        },
      });

      if (!camera) {
        return reply.code(404).send({ error: 'Camera not found' });
      }

      return reply.send(camera);
    }
  );

  // Create camera
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = cameraSchema.parse(request.body);

        const camera = await prisma.camera.create({
          data: {
            ...data,
            userId: request.user!.userId,
          },
        });

        return reply.code(201).send(camera);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Update camera
  fastify.put<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = updateCameraSchema.parse(request.body);

        // Check ownership
        const existing = await prisma.camera.findFirst({
          where: {
            id: request.params.id,
            userId: request.user!.userId,
          },
        });

        if (!existing) {
          return reply.code(404).send({ error: 'Camera not found' });
        }

        const camera = await prisma.camera.update({
          where: { id: request.params.id },
          data,
        });

        return reply.send(camera);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Delete camera
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      // Check ownership
      const existing = await prisma.camera.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.userId,
        },
      });

      if (!existing) {
        return reply.code(404).send({ error: 'Camera not found' });
      }

      await prisma.camera.delete({
        where: { id: request.params.id },
      });

      return reply.code(204).send();
    }
  );
}
