import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import type { CreateUserInput, LoginInput, AuthResponse } from '../types';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register new user
  fastify.post<{ Body: CreateUserInput }>(
    '/register',
    async (request, reply) => {
      try {
        const data = registerSchema.parse(request.body);

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ email: data.email }, { username: data.username }],
          },
        });

        if (existingUser) {
          return reply.code(400).send({
            error: existingUser.email === data.email
              ? 'Email already registered'
              : 'Username already taken',
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            email: data.email,
            password: hashedPassword,
            name: data.name,
            username: data.username,
          },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
          },
        });

        // Generate JWT
        const token = fastify.jwt.sign({
          userId: user.id,
          email: user.email,
        });

        const response: AuthResponse = {
          token,
          user,
        };

        return reply.code(201).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors });
        }
        throw error;
      }
    }
  );

  // Login
  fastify.post<{ Body: LoginInput }>('/login', async (request, reply) => {
    try {
      const data = loginSchema.parse(request.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
      });

      const response: AuthResponse = {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
        },
      };

      return reply.send(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: error.errors });
      }
      throw error;
    }
  });

  // Get current user
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user?.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        bio: true,
        location: true,
        website: true,
        profileVisibility: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return reply.send(user);
  });
}
