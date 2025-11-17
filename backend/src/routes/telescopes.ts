import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const telescopeSchema = z.object({
  name: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  focalLengthMm: z.number().positive(),
  apertureMm: z.number().positive(),
  focalRatio: z.number().positive().optional(),
  notes: z.string().optional(),
});

const updateTelescopeSchema = telescopeSchema.partial();

export default async function telescopesRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all user's telescopes
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const telescopes = await prisma.telescope.findMany({
      where: { userId: request.user!.userId },
      orderBy: { name: 'asc' },
    });

    return reply.send(telescopes);
  });

  // Get single telescope
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const telescope = await prisma.telescope.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.userId,
        },
      });

      if (!telescope) {
        return reply.code(404).send({ error: 'Telescope not found' });
      }

      return reply.send(telescope);
    }
  );

  // Create telescope
  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = telescopeSchema.parse(request.body);

        const telescope = await prisma.telescope.create({
          data: {
            ...data,
            userId: request.user!.userId,
          },
        });

        return reply.code(201).send(telescope);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Update telescope
  fastify.put<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = updateTelescopeSchema.parse(request.body);

        // Check ownership
        const existing = await prisma.telescope.findFirst({
          where: {
            id: request.params.id,
            userId: request.user!.userId,
          },
        });

        if (!existing) {
          return reply.code(404).send({ error: 'Telescope not found' });
        }

        const telescope = await prisma.telescope.update({
          where: { id: request.params.id },
          data,
        });

        return reply.send(telescope);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Delete telescope
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      // Check ownership
      const existing = await prisma.telescope.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.userId,
        },
      });

      if (!existing) {
        return reply.code(404).send({ error: 'Telescope not found' });
      }

      await prisma.telescope.delete({
        where: { id: request.params.id },
      });

      return reply.code(204).send();
    }
  );
}
