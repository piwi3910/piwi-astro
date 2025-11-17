import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JWTPayload } from '../types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const payload = await request.jwtVerify<JWTPayload>();
    request.user = payload;
  } catch (error) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const payload = await request.jwtVerify<JWTPayload>();
    request.user = payload;
  } catch {
    // No user authenticated, but don't throw error
    request.user = undefined;
  }
}
