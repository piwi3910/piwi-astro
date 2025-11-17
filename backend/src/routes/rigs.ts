import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { calculateFOV } from '../utils/fov';

const rigSchema = z.object({
  name: z.string().min(1).max(100),
  telescopeId: z.string().uuid(),
  cameraId: z.string().uuid(),
  reducerFactor: z.number().positive().optional().default(1.0),
  barlowFactor: z.number().positive().optional().default(1.0),
  rotationDegDefault: z.number().min(0).max(360).optional().default(0),
});

const updateRigSchema = rigSchema.partial();

export default async function rigsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all user's rigs with computed FOV
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const rigs = await prisma.rig.findMany({
      where: { userId: request.user!.userId },
      include: {
        telescope: true,
        camera: true,
      },
      orderBy: { name: 'asc' },
    });

    // Add FOV calculations to each rig
    const rigsWithFOV = rigs.map((rig) => {
      const fov = calculateFOV(
        rig.telescope.focalLengthMm,
        rig.camera.sensorWidthMm,
        rig.camera.sensorHeightMm,
        rig.camera.pixelSizeUm,
        rig.reducerFactor || 1.0,
        rig.barlowFactor || 1.0
      );

      return {
        ...rig,
        fov,
      };
    });

    return reply.send(rigsWithFOV);
  });

  // Get single rig with FOV
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const rig = await prisma.rig.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.userId,
        },
        include: {
          telescope: true,
          camera: true,
        },
      });

      if (!rig) {
        return reply.code(404).send({ error: 'Rig not found' });
      }

      const fov = calculateFOV(
        rig.telescope.focalLengthMm,
        rig.camera.sensorWidthMm,
        rig.camera.sensorHeightMm,
        rig.camera.pixelSizeUm,
        rig.reducerFactor || 1.0,
        rig.barlowFactor || 1.0
      );

      return reply.send({
        ...rig,
        fov,
      });
    }
  );

  // Create rig
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = rigSchema.parse(request.body);

        // Verify telescope and camera belong to user
        const telescope = await prisma.telescope.findFirst({
          where: {
            id: data.telescopeId,
            userId: request.user!.userId,
          },
        });

        if (!telescope) {
          return reply.code(400).send({ error: 'Telescope not found or does not belong to you' });
        }

        const camera = await prisma.camera.findFirst({
          where: {
            id: data.cameraId,
            userId: request.user!.userId,
          },
        });

        if (!camera) {
          return reply.code(400).send({ error: 'Camera not found or does not belong to you' });
        }

        const rig = await prisma.rig.create({
          data: {
            ...data,
            userId: request.user!.userId,
          },
          include: {
            telescope: true,
            camera: true,
          },
        });

        const fov = calculateFOV(
          telescope.focalLengthMm,
          camera.sensorWidthMm,
          camera.sensorHeightMm,
          camera.pixelSizeUm,
          rig.reducerFactor || 1.0,
          rig.barlowFactor || 1.0
        );

        return reply.code(201).send({
          ...rig,
          fov,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Update rig
  fastify.put<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = updateRigSchema.parse(request.body);

        // Check ownership
        const existing = await prisma.rig.findFirst({
          where: {
            id: request.params.id,
            userId: request.user!.userId,
          },
        });

        if (!existing) {
          return reply.code(404).send({ error: 'Rig not found' });
        }

        // If updating telescope or camera, verify ownership
        if (data.telescopeId) {
          const telescope = await prisma.telescope.findFirst({
            where: {
              id: data.telescopeId,
              userId: request.user!.userId,
            },
          });

          if (!telescope) {
            return reply.code(400).send({ error: 'Telescope not found or does not belong to you' });
          }
        }

        if (data.cameraId) {
          const camera = await prisma.camera.findFirst({
            where: {
              id: data.cameraId,
              userId: request.user!.userId,
            },
          });

          if (!camera) {
            return reply.code(400).send({ error: 'Camera not found or does not belong to you' });
          }
        }

        const rig = await prisma.rig.update({
          where: { id: request.params.id },
          data,
          include: {
            telescope: true,
            camera: true,
          },
        });

        const fov = calculateFOV(
          rig.telescope.focalLengthMm,
          rig.camera.sensorWidthMm,
          rig.camera.sensorHeightMm,
          rig.camera.pixelSizeUm,
          rig.reducerFactor || 1.0,
          rig.barlowFactor || 1.0
        );

        return reply.send({
          ...rig,
          fov,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Delete rig
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      // Check ownership
      const existing = await prisma.rig.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.userId,
        },
      });

      if (!existing) {
        return reply.code(404).send({ error: 'Rig not found' });
      }

      await prisma.rig.delete({
        where: { id: request.params.id },
      });

      return reply.code(204).send();
    }
  );
}
