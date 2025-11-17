# AstroPlanner Web Application — Technical Specification (MVP + Extended Features)

## Overview
AstroPlanner is a web-based astrophotography planning tool designed to help users select astrophotography targets, calculate FOVs for their telescope/camera combinations, plan imaging sessions, upload their results, and track their progress over time.  
This document defines the **full architecture**, **data models**, **features**, and **tech stack** required for the MVP and extended features.

---

# 1. High-Level Architecture

## 1.1 Frontend
- **Framework:** React + TypeScript (Next.js recommended)
- **UI Library:** Mantine / Chakra / MUI / shadcn/ui
- **State Management:** TanStack Query (server state) + Zustand (client state)
- **Visualization:**
  - Canvas/SVG for FOV rendering
  - Optional: Aladin Lite for real-sky backgrounds
- **Uploads:** react-dropzone or Uppy

## 1.2 Backend
- **Runtime:** Node.js
- **Framework:** Fastify or NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** Clerk / Auth0 / Supabase Auth / Custom JWT
- **File Storage:** AWS S3, Backblaze, Wasabi, or MinIO

## 1.3 Optional Integrations
- Sky survey APIs (for real backgrounds)
- Google Calendar API (sync imaging sessions)
- Weather APIs (seeing/cloud forecasts)

---

# 2. Core Features

## 2.1 User Gear Management
Each user can:
- Add unlimited **Telescopes**
- Add unlimited **Cameras**
- Create **Rigs** (telescope + camera + reducer/barlow)
- Automatically compute FOV & pixel scale

## 2.2 Target Catalog
- Preloaded catalog (Messier + bright NGC)
- Each target has RA/Dec, size, magnitude, type
- Filtering by altitude, time, object type, FOV fit

## 2.3 FOV Planner
- Select a rig
- See computed FOV rectangle
- Drag/rotate FOV onto sky map
- Show visibility window for selected night

## 2.4 User Collections
- **Wishlist**: objects they want to shoot
- **Shot Objects**: objects already photographed
- **Uploaded Images**: per object, per session

## 2.5 Imaging Sessions / Calendar
- Users create imaging sessions with:
  - Time range
  - Location
  - Planned targets
  - Selected rig
- Calendar page shows all upcoming/past sessions
- Each session may include uploaded images

---

# 3. Data Models (Prisma Schema Reference)

## 3.1 User
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  telescopes Telescope[]
  cameras   Camera[]
  rigs      Rig[]
  sessions  Session[]
  userTargets UserTarget[]
  images    ImageUpload[]
}
```

## 3.2 Telescope
```prisma
model Telescope {
  id            String  @id @default(uuid())
  userId        String
  name          String
  brand         String?
  model         String?
  focalLengthMm Float
  apertureMm    Float
  focalRatio    Float?
  notes         String?

  user User @relation(fields: [userId], references: [id])
}
```

## 3.3 Camera
```prisma
model Camera {
  id             String  @id @default(uuid())
  userId         String
  name           String
  brand          String?
  model          String?
  sensorWidthMm  Float
  sensorHeightMm Float
  resolutionX    Int
  resolutionY    Int
  pixelSizeUm    Float
  sensorType     String
  notes          String?

  user User @relation(fields: [userId], references: [id])
}
```

## 3.4 Rig (Telescope + Camera)
```prisma
model Rig {
  id         String  @id @default(uuid())
  userId     String
  name       String
  telescopeId String
  cameraId    String
  reducerFactor Float?
  barlowFactor Float?
  rotationDegDefault Float?

  user      User      @relation(fields: [userId], references: [id])
  telescope Telescope @relation(fields: [telescopeId], references: [id])
  camera    Camera    @relation(fields: [cameraId], references: [id])
}
```

## 3.5 Target Catalog
```prisma
model Target {
  id              String  @id @default(uuid())
  catalogId       String?
  name            String
  type            String
  raDeg           Float
  decDeg          Float
  sizeMajorArcmin Float?
  sizeMinorArcmin Float?
  magnitude       Float?
  constellation   String?

  userTargets  UserTarget[]
  sessionTargets SessionTarget[]
}
```

## 3.6 UserTarget (Wishlist / Shot / Completed)
```prisma
model UserTarget {
  id          String  @id @default(uuid())
  userId      String
  targetId    String
  status      String // WISHLIST | PLANNED | SHOT | PROCESSED
  rating      Int?
  notes       String?
  firstShotAt Date?
  lastShotAt  Date?
  timesShot   Int     @default(0)

  user   User   @relation(fields: [userId], references: [id])
  target Target @relation(fields: [targetId], references: [id])
}
```

## 3.7 Sessions (Calendar Events)
```prisma
model Session {
  id            String   @id @default(uuid())
  userId        String
  name          String
  locationName  String?
  latitude      Float
  longitude     Float
  startTime     Date
  endTime       Date
  moonPhasePercent Float?
  seeingEstimate String?
  notes         String?

  user           User @relation(fields: [userId], references: [id])
  sessionTargets SessionTarget[]
}
```

## 3.8 SessionTargets (Targets in a Session)
```prisma
model SessionTarget {
  id         String  @id @default(uuid())
  sessionId  String
  targetId   String
  rigId      String?
  planned    Boolean @default(true)
  notes      String?

  session Session @relation(fields: [sessionId], references: [id])
  target  Target  @relation(fields: [targetId], references: [id])
  rig     Rig?    @relation(fields: [rigId], references: [id])
}
```

## 3.9 Image Uploads
```prisma
model ImageUpload {
  id             String  @id @default(uuid())
  userId         String
  targetId       String
  sessionId      String?
  rigId          String?

  storageKey     String
  url            String
  thumbnailUrl   String?

  exposureTimeSec     Float?
  totalIntegrationMin Float?
  filter              String?
  isoGain             String?
  uploadedAt          Date @default(now())
  notes               String?

  user    User    @relation(fields: [userId], references: [id])
  target  Target  @relation(fields: [targetId], references: [id])
  session Session? @relation(fields: [sessionId], references: [id])
  rig     Rig?     @relation(fields: [rigId], references: [id])
}
```

---

# 4. Feature Flow Descriptions

## 4.1 Adding Gear
1. User goes to **Settings → Gear**
2. Adds Telescopes
3. Adds Cameras
4. Creates Rigs (selecting telescope + camera)
5. Rig is now selectable in the planner

## 4.2 Using the FOV Planner
- Select a rig
- FOV computed using formulas:
  - Pixel Scale:  
    `arcsec/pixel = 206.265 * (pixel_size_µm / focal_length_mm)`
  - FOV Width/Height:  
    `(sensor_mm / focal_length_mm) * (180 / π)`
- Display FOV rectangle on sky map
- Allow rotation & dragging
- Show visibility window for chosen date/time

## 4.3 Wishlist → Session → Shot Flow
1. Browse targets → Add to Wishlist  
2. Create imaging session for a night  
3. Add targets from Wishlist to session  
4. After the night, upload images  
5. Mark target as SHOT  
6. Gallery shows all user images per target

---

# 5. Pages & Components

## Pages
- **Dashboard**
- **Targets Browser**
- **Target Detail (FOV, data, gallery)**
- **Planner (FOV tool + sky map)**
- **Gear Manager**
- **Wishlist**
- **Shot Objects**
- **Sessions Calendar**
- **Session Details**
- **Profile / Settings**

## Core UI Components
- FOVRenderer (Canvas or SVG)
- SkyMap (Aladin Lite optional)
- GearForm
- SessionCard
- CalendarView
- TargetTable
- ImageUploader
- GalleryGrid

---

# 6. Optional Future Enhancements
- Community image gallery
- Auto AFOV forecasting
- Exposure calculator
- Weather radar integration
- Mosaic planning
- Automated rig suggestions

---

# 7. MVP Scope (Must-Have)
- User auth
- Telescopes, cameras, rigs
- Target catalog + filtering
- FOV planner with rig FOV rectangle
- Wishlist, sessions, shot history
- Image uploads to S3
- Calendar of sessions

---

# 8. Deployment
- Frontend: Vercel / Netlify
- Backend: Railway / Fly.io
- Database: Supabase / Neon / RDS
- File storage: S3 / Backblaze / MinIO

---

This document defines everything required for an AI coder to begin implementation of the full AstroPlanner MVP + extended features.
