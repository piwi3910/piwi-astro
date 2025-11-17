# AstroPlanner

A comprehensive web-based astrophotography planning and portfolio platform. Plan your imaging sessions, calculate fields of view, track your progress, and showcase your work to the community.

## Features

### Private Planning Tools
- 🔭 **Gear Management**: Add telescopes, cameras, and create rigs with automatic FOV calculations
- 🎯 **Target Catalog**: Browse Messier and NGC objects with filtering and search
- 📐 **FOV Planner**: Interactive field of view planning with drag-and-rotate capabilities
- 📅 **Session Planning**: Schedule imaging sessions with target planning
- 📊 **Progress Tracking**: Track wishlist, planned, shot, and processed targets

### Public Portfolio & Community
- 🌌 **Public Gallery**: Showcase your astrophotography to the world
- 👤 **User Profiles**: Build your portfolio with custom username and bio
- 🔍 **Discover**: Browse amazing work from other astrophotographers
- 🔒 **Privacy Controls**: Choose what to share publicly and what to keep private
- ⭐ **Featured Images**: Get your best work featured on the platform

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Mantine UI** for beautiful, accessible components
- **TanStack Query** for server state management
- **Zustand** for client state management
- **Axios** for API communication

### Backend
- **Fastify** high-performance API server
- **Prisma ORM** with PostgreSQL
- **JWT** authentication
- **MinIO** (S3-compatible) for image storage
- **Zod** for validation
- **bcryptjs** for password hashing

### Infrastructure
- **Docker Compose** for local development
- **PostgreSQL 16** database
- **MinIO** object storage

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/piwi3910/piwi-astro.git
   cd piwi-astro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults work for local development)
   ```

4. **Start Docker services**
   ```bash
   npm run docker:up
   ```

   This starts:
   - PostgreSQL on port 5433
   - MinIO on port 9000 (API) and 9001 (Console)

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend API: http://localhost:4000
   - Frontend: http://localhost:3000

### Accessing Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin)
- **Prisma Studio**: `npm run prisma:studio` (http://localhost:5555)

## Project Structure

```
piwi-astro/
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities (API client)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── store/         # Zustand stores
│   │   └── types/         # TypeScript types
│   ├── package.json
│   └── tsconfig.json
│
├── backend/               # Fastify API server
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, validation
│   │   ├── lib/           # Prisma, MinIO clients
│   │   ├── utils/         # FOV calculations, helpers
│   │   └── types/         # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml     # Local development services
├── package.json           # Root workspace config
├── CLAUDE.md             # AI assistant guidance
└── README.md             # This file
```

## Development Commands

### Root Level
```bash
npm run dev              # Start both frontend and backend
npm run build            # Build both applications
npm run lint             # Lint both applications
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs
npm run prisma:studio    # Open Prisma Studio
npm run prisma:migrate   # Run database migrations
npm run prisma:generate  # Generate Prisma Client
```

### Frontend Only
```bash
cd frontend
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # Run ESLint
npm run type-check       # TypeScript validation
```

### Backend Only
```bash
cd backend
npm run dev              # Start Fastify with hot reload
npm run build            # Compile TypeScript
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript validation
```

## Database Schema

See `backend/prisma/schema.prisma` for the complete database schema. Key models:

- **User**: User accounts with profile information
- **Telescope**: User's telescope equipment
- **Camera**: User's camera equipment
- **Rig**: Telescope + Camera combinations with FOV calculations
- **Target**: Astronomical objects catalog
- **UserTarget**: User's relationship with targets (wishlist, shot, etc.)
- **Session**: Imaging session planning
- **SessionTarget**: Targets planned for specific sessions
- **ImageUpload**: User's astrophotography uploads with metadata

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (authenticated)

### Health Check
- `GET /health` - API and database status

More endpoints will be documented as they are implemented.

## FOV Calculations

The application uses accurate astronomical formulas for field of view calculations:

- **Pixel Scale**: `206.265 * (pixel_size_µm / focal_length_mm)` arcsec/pixel
- **FOV**: `(sensor_mm / focal_length_mm) * (180 / π) * 60` arcminutes
- Accounts for focal reducers and barlow lenses

## Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `S3_*`: MinIO/S3 storage configuration
- `NEXT_PUBLIC_API_URL`: Backend API URL (for frontend)

## Contributing

See the [project specification](astroplanner_spec.md) for detailed feature requirements and architecture.

## License

Private project - All rights reserved

## Support

For issues and questions, please create a GitHub issue in this repository.
