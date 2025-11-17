import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { authenticate, optionalAuth } from './middleware/auth';
import { initializeStorage } from './lib/minio';

// Routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

const start = async (): Promise<void> => {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'change_this_in_production',
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    });

    // Decorate fastify with auth middleware
    fastify.decorate('authenticate', authenticate);
    fastify.decorate('optionalAuth', optionalAuth);

    // Initialize storage
    await initializeStorage();

    // Register routes
    await fastify.register(healthRoutes);
    await fastify.register(authRoutes, { prefix: '/api/auth' });

    // Start server
    const port = parseInt(process.env.API_PORT || '4000', 10);
    const host = process.env.API_HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`🚀 Server running at http://${host}:${port}`);
    console.log(`📊 Health check: http://${host}:${port}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await fastify.close();
  process.exit(0);
});

start();

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
    optionalAuth: typeof optionalAuth;
  }
}
