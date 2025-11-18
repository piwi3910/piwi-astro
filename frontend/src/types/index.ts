export interface User {
  id: string;
  email: string;
  name: string | null;
  username: string;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  profileVisibility: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Target {
  id: string;
  catalogId: string | null;
  name: string;
  type: string;
  raDeg: number;
  decDeg: number;
  sizeMajorArcmin: number | null;
  sizeMinorArcmin: number | null;
  magnitude: number | null;
  constellation: string | null;
}

export interface ImageUpload {
  id: string;
  userId: string;
  targetId: string;
  sessionId: string | null;
  rigId: string | null;
  storageKey: string;
  url: string;
  thumbnailUrl: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  title: string | null;
  description: string | null;
  viewCount: number;
  featured: boolean;
  exposureTimeSec: number | null;
  totalIntegrationMin: number | null;
  filter: string | null;
  isoGain: string | null;
  uploadedAt: string;
  notes: string | null;
}

export interface TelescopeCatalog {
  id: string;
  brand: string;
  model: string;
  apertureMm: number;
  focalLengthMm: number;
  focalRatio: number;
  externalId: string | null;
  isActive: boolean;
}

export interface Telescope {
  id: string;
  userId: string;
  catalogId: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  focalLengthMm: number;
  apertureMm: number;
  focalRatio: number | null;
  notes: string | null;
}

export interface CameraCatalog {
  id: string;
  brand: string;
  model: string;
  pixelSizeUm: number;
  resolutionX: number;
  resolutionY: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  externalId: string | null;
  isActive: boolean;
}

export interface Camera {
  id: string;
  userId: string;
  catalogId: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  sensorWidthMm: number;
  sensorHeightMm: number;
  resolutionX: number;
  resolutionY: number;
  pixelSizeUm: number;
  sensorType: string;
  notes: string | null;
}

export interface FOV {
  fovWidthArcmin: number;
  fovHeightArcmin: number;
  pixelScaleArcsecPerPixel: number;
}

export interface Rig {
  id: string;
  userId: string;
  name: string;
  telescopeId: string;
  cameraId: string;
  reducerFactor: number | null;
  barlowFactor: number | null;
  rotationDegDefault: number | null;
  telescope: Telescope;
  camera: Camera;
  fov: FOV;
}

export interface CreateTelescopeInput {
  catalogId?: string;
  name: string;
  brand?: string;
  model?: string;
  focalLengthMm: number;
  apertureMm: number;
  focalRatio?: number;
  notes?: string;
}

export interface CreateCameraInput {
  catalogId?: string;
  name: string;
  brand?: string;
  model?: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  resolutionX: number;
  resolutionY: number;
  pixelSizeUm: number;
  sensorType: string;
  notes?: string;
}

export interface CreateRigInput {
  name: string;
  telescopeId: string;
  cameraId: string;
  reducerFactor?: number;
  barlowFactor?: number;
  rotationDegDefault?: number;
}
