# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AstroPlanner is a dual-purpose web application for astrophotographers:

1. **Private Planning Tools**: Personal workspace for selecting targets, calculating fields of view (FOV) for telescope/camera combinations, planning imaging sessions, and tracking progress
2. **Public Portfolio & Community**: Public-facing pages where astrophotographers can showcase their work, browse others' images, and build their portfolio

This dual nature (private tools + public showcase) is central to the architecture and must be reflected in the data model, routing, and privacy controls.

## Claude Code Workflow

**IMPORTANT: Parallel Agent Delegation**

For all tasks and jobs in this project, Claude Code should delegate work to specialized agents running in parallel whenever possible. This includes:

- **Feature Implementation**: Use multiple agents (frontend, backend, testing) simultaneously
- **Bug Fixes**: Parallel investigation and resolution across affected components
- **Refactoring**: Coordinate multiple agents to refactor related code in parallel
- **Testing**: Run test creation, implementation, and verification concurrently
- **Documentation**: Update docs in parallel with code changes

**Benefits of Parallel Execution**:
- Faster completion of complex tasks
- Better separation of concerns (each agent focuses on their specialty)
- More efficient use of development time
- Comprehensive coverage across all aspects (code, tests, docs, security)

**How to Apply**:
- When receiving a task, immediately identify which specialized agents can work in parallel
- Launch multiple agents in a single message using multiple Task tool calls
- Only run agents sequentially when there are hard dependencies between tasks
- Default to parallel execution unless sequential work is explicitly required

## Tech Stack

### Frontend
- **Framework**: React + TypeScript with Next.js
- **UI Library**: Mantine / Chakra / MUI / shadcn/ui
- **State Management**: TanStack Query (server state) + Zustand (client state)
- **Visualization**: Canvas/SVG for FOV rendering, optional Aladin Lite for real-sky backgrounds
- **File Uploads**: react-dropzone or Uppy

### Backend
- **Runtime**: Node.js
- **Framework**: Fastify or NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: Clerk / Auth0 / Supabase Auth / Custom JWT
- **File Storage**: AWS S3, Backblaze, Wasabi, or MinIO

## Core Architecture Concepts

### Domain Model Hierarchy

The application revolves around these key domain entities in hierarchical relationships:

1. **User** → owns multiple Telescopes, Cameras, and Rigs
2. **Telescope + Camera** → combined into a **Rig** (with optional reducer/barlow factors)
3. **Rig** → has computed FOV and pixel scale properties
4. **Target** → astronomical object from catalog (Messier, NGC)
5. **UserTarget** → user's relationship with a target (WISHLIST → PLANNED → SHOT → PROCESSED)
6. **Session** → imaging event with time, location, and planned targets
7. **SessionTarget** → links targets to sessions with specific rigs
8. **ImageUpload** → user's astrophotography results linked to targets and sessions

### Key Business Logic

**FOV Calculations**: Critical formulas that must be implemented correctly:
- Pixel Scale: `arcsec/pixel = 206.265 * (pixel_size_µm / focal_length_mm)`
- FOV Width/Height: `(sensor_mm / focal_length_mm) * (180 / π)`
- Account for reducer/barlow factors in rig configuration

**Target Status Flow**:
- WISHLIST (user wants to shoot)
- PLANNED (added to an upcoming session)
- SHOT (images uploaded)
- PROCESSED (final image created)

**Session Planning Workflow**:
1. User creates session with date/time/location
2. Adds targets from wishlist to session
3. Associates rig(s) with targets
4. After session, uploads images
5. Images automatically update target status

### Data Relationships

- Rigs must validate that telescope and camera belong to the same user
- SessionTargets can optionally specify which rig was used (nullable)
- ImageUploads can be associated with both a target and optionally a session
- UserTarget tracks statistics: firstShotAt, lastShotAt, timesShot

### Public vs Private Architecture

The application has two distinct user experiences:

**Private Workspace** (`/dashboard`, `/planner`, `/gear`, `/sessions`):
- Authenticated users only
- Full CRUD access to personal gear, plans, sessions
- Private wishlist and planning tools
- FOV calculator and session planner

**Public Pages** (`/gallery`, `/users/:username`, `/explore`):
- Publicly accessible (no auth required)
- Browse community images and portfolios
- Discover astrophotographers and their work
- SEO-optimized for search engines

**Privacy Controls** (Required in Data Model):
- User profile visibility: Public / Private
- Image visibility: Public / Private / Unlisted
- Gear visibility: Show in profile / Hide from profile
- Username/slug for public URLs (e.g., `/users/astro-john`)
- Bio, location, social links for public profiles

**Key Implementation Requirements**:
- Next.js routing should clearly separate public (`/`) and private (`/dashboard`) routes
- Public pages must work without authentication
- Implement proper Open Graph tags for social sharing
- Generate sitemaps for public portfolios and galleries
- Consider image watermarking options for public display

## Development Commands

Since this is a new project, commands will be added as the project structure is established. Common patterns for this stack:

### Frontend (Next.js)
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Backend (Fastify/NestJS)
```bash
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
```

### Database (Prisma)
```bash
npx prisma generate              # Generate Prisma Client
npx prisma migrate dev           # Create and apply migration
npx prisma migrate deploy        # Apply migrations in production
npx prisma studio                # Open database GUI
npx prisma db seed              # Seed database with initial data
```

## Implementation Priorities

### MVP Must-Haves (Phase 1)

**Private Tools**:
1. User authentication with profile setup
2. Gear management (telescopes, cameras, rigs with FOV calculation)
3. Target catalog with filtering (altitude, time, object type, FOV fit)
4. FOV planner with interactive sky map
5. Wishlist and shot tracking
6. Session calendar and planning
7. Image upload to cloud storage with metadata

**Public Features**:
8. Public user profiles with username/slug
9. Public image gallery (filterable by target, user, date)
10. User portfolio pages (`/users/:username`)
11. Community explore page with featured images
12. Privacy controls (public/private toggle for images and profile)

### Extended Features (Phase 2+)

**Community & Social**:
- Social interactions (likes, favorites, comments)
- Follow system for photographers
- Activity feed for followed users
- Image collections/albums
- Community challenges or themes

**Advanced Planning Tools**:
- AFOV forecasting
- Exposure calculator
- Weather radar integration
- Mosaic planning
- Automated rig suggestions
- Sky quality/light pollution maps integration

## Critical Implementation Notes

### FOV Planner Requirements
- Must support drag and rotate operations on FOV rectangle
- Must show visibility window for selected date/time
- Must accurately compute sensor dimensions accounting for reducer/barlow factors
- Rotation angle should be configurable per rig with default value

### User Experience Flow: Private to Public

**Upload Workflow**:
1. User uploads image in private dashboard
2. Image defaults to `PRIVATE` visibility
3. User adds title, description, and metadata
4. User explicitly toggles to `PUBLIC` when ready to share
5. Public image appears in gallery and on user's portfolio

**First-Time User Onboarding**:
1. Sign up → Create account
2. Set username (required for public profile)
3. Optional: Add bio, location, avatar
4. Choose initial profile visibility (PUBLIC by default)
5. Dashboard tour highlighting private vs public features

**Portfolio Building**:
- Users can set a "featured" image for their profile
- Gallery page shows user's public images in grid
- Each image links to detail page with full metadata
- Option to share individual image URLs or entire portfolio

### File Upload Strategy
- Store original images in cloud storage (S3/Backblaze/Wasabi/MinIO)
- Generate thumbnails for gallery views
- Store both `storageKey` and `url` in database
- Associate uploads with user, target, optional session, optional rig
- Capture EXIF metadata: exposure time, total integration, filter, ISO/gain

### Target Catalog Seeding
- Initial seed should include full Messier catalog (M1-M110)
- Include bright NGC objects suitable for amateur astrophotography
- Each target needs: catalogId, name, type, RA/Dec, size (major/minor arcmin), magnitude, constellation
- Consider importing from existing astronomical databases (SIMBAD, NED)

### Authentication Flow
- Implement proper user session management
- Ensure all gear, sessions, and images are scoped to authenticated user
- API endpoints must validate user ownership before mutations
- Consider multi-tenancy from the start (userId foreign keys on all user data)

## Database Schema Notes

Refer to `astroplanner_spec.md` for complete Prisma schema definitions. Key points:

- All IDs use UUID format (`@default(uuid())`)
- Timestamps use `Date` type with `@default(now())` where appropriate
- Relations properly defined with `@relation` directives
- Consider adding indexes for: userId, targetId, sessionId, status fields
- Add unique constraints where needed (e.g., user email)

### Required Schema Extensions for Public/Community Features

The base spec needs these additional fields:

**User Model**:
```prisma
username      String   @unique      // For public URLs (/users/astro-john)
bio           String?               // Public profile description
location      String?               // City/region for profile
website       String?               // Personal website link
profileVisibility String @default("PUBLIC")  // PUBLIC | PRIVATE
avatarUrl     String?               // Profile picture
createdAt     DateTime @default(now())
```

**ImageUpload Model**:
```prisma
visibility    String   @default("PRIVATE")  // PUBLIC | PRIVATE | UNLISTED
title         String?                        // User-provided title
description   String?                        // Description for public display
viewCount     Int      @default(0)          // Track popularity
featured      Boolean  @default(false)      // Admin-curated featured images
```

**Indexes for Public Queries**:
- `@@index([visibility, uploadedAt])` on ImageUpload for gallery pagination
- `@@index([username])` on User for profile lookups
- `@@index([targetId, visibility])` for target-specific galleries

## API Design Patterns

### RESTful Endpoints Structure

**Private API (Authenticated)**:
```
/api/telescopes      # CRUD for user's telescopes
/api/cameras         # CRUD for user's cameras
/api/rigs            # CRUD for user's rigs (includes computed FOV)
/api/targets         # Read-only catalog, filtering
/api/user-targets    # User's wishlist/status management
/api/sessions        # CRUD for imaging sessions
/api/session-targets # Manage targets within sessions
/api/images          # Upload and manage images
/api/profile         # Update user profile, privacy settings
```

**Public API (No Auth Required)**:
```
/api/public/gallery           # Browse all public images
/api/public/users/:username   # Get user's public profile & images
/api/public/explore           # Featured/trending images
/api/public/targets/:id       # Images for specific target (M31, etc.)
/api/public/search            # Search images, users, targets
/api/public/stats             # Platform statistics (total images, users, etc.)
```

### Response Patterns
- Return computed fields (FOV, pixel scale) with rig data
- Include related entities in responses where needed (e.g., rig includes telescope and camera)
- Paginate list endpoints (targets, sessions, images)
- Filter and sort capabilities for catalogs
- Public endpoints must filter for `visibility: 'PUBLIC'` only
- Include user attribution in public image responses (username, profile link)

## SEO & Public Pages

### Next.js Routing Strategy
- Use App Router for better SEO and streaming
- Public routes: `/`, `/gallery`, `/explore`, `/users/[username]`, `/targets/[catalogId]`
- Private routes: `/dashboard/*`, `/planner/*`, `/gear/*`, `/sessions/*`
- Implement proper `layout.tsx` for public vs private sections

### Metadata & Social Sharing
- **Dynamic Open Graph tags** for user profiles and images:
  ```tsx
  // For /users/[username]
  og:title = "Astro John's Astrophotography Portfolio"
  og:image = user's featured image or avatar
  og:description = user bio

  // For individual images
  og:title = image title or target name
  og:image = full-res image URL
  og:description = exposure details, target info
  ```
- **Twitter Cards** for image sharing
- **Structured Data** (JSON-LD) for rich snippets:
  - Person schema for user profiles
  - ImageObject schema for astrophotos

### Performance & Caching
- **Server Components** for public pages (better initial load)
- **Static Generation** where possible (target catalog pages)
- **Image Optimization**: Next.js Image component with srcset
- **CDN**: CloudFront or Cloudflare for image delivery
- **ISR (Incremental Static Regeneration)** for popular profiles/galleries

### Sitemap & Indexing
- Generate dynamic sitemap including:
  - All public user profiles
  - Popular target pages (M31, M42, etc.)
  - Recent public images (sample)
- `robots.txt` allowing public pages, disallowing dashboard
- Canonical URLs to prevent duplicate content

## Testing Considerations

### Critical Calculation Tests
- FOV computation accuracy (pixel scale and field dimensions)
- Reducer/barlow factor application
- Coordinate transformations (RA/Dec handling)
- Visibility window calculations

### Integration Tests
- Complete user workflow: gear setup → target selection → session planning → image upload
- File upload and storage integration
- Authentication and authorization
- Privacy workflow: upload private image → change to public → verify visibility
- Public gallery filtering (only public images appear)
- Profile privacy (private profiles don't appear in search/explore)

### Edge Cases
- Rigs with extreme focal lengths or sensor sizes
- Targets near celestial poles (Dec ±90°)
- Sessions spanning midnight
- Multiple images per target per session

## Security Considerations

### Authentication & Authorization
- Validate file uploads (type, size limits)
- Sanitize user inputs for telescope/camera names, usernames, bio text
- Ensure users can only access/modify their own private data
- Secure cloud storage URLs (signed URLs for S3)
- Rate limit image uploads (per user, per day)
- SQL injection prevention via Prisma (parameterized queries)

### Privacy & Public Content
- **Visibility Enforcement**: Public API endpoints MUST filter for `visibility: 'PUBLIC'`
- **Profile Privacy**: Respect `profileVisibility` - private profiles should not appear in searches/explore
- **Username Validation**: Prevent offensive/reserved usernames, enforce alphanumeric + hyphens/underscores
- **Content Moderation**: Consider flagging system for inappropriate public images
- **GDPR Compliance**: Allow users to export/delete all their data
- **Image Rights**: Terms requiring users to own rights to uploaded images

### Public Page Security
- Rate limiting on public endpoints to prevent scraping
- Implement proper CORS for public API
- CDN/caching strategy for public images (CloudFront, Cloudflare)
- Bot detection for gallery pages
- Prevent email harvesting (don't expose emails on public profiles)
