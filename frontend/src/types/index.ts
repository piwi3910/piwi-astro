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
