import type {
  Telescope,
  TelescopeCatalog,
  Camera,
  Rig,
  CreateTelescopeInput,
  CreateCameraInput,
  CreateRigInput,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Telescope Catalog
export const getTelescopeBrands = (): Promise<{ brands: string[] }> => {
  const params = new URLSearchParams({ type: 'brands' });
  return fetchAPI(`/api/telescope-catalog?${params.toString()}`);
};

export const getTelescopesByBrand = (
  brand: string,
  limit: number = 100,
  offset: number = 0
): Promise<{ telescopes: TelescopeCatalog[]; total: number; hasMore: boolean }> => {
  const params = new URLSearchParams({
    brand,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  return fetchAPI(`/api/telescope-catalog?${params.toString()}`);
};

export const searchTelescopeCatalog = (
  search: string = '',
  limit: number = 20,
  offset: number = 0
): Promise<{ telescopes: TelescopeCatalog[]; total: number; hasMore: boolean }> => {
  const params = new URLSearchParams({
    search,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  return fetchAPI(`/api/telescope-catalog?${params.toString()}`);
};

// Telescopes
export const getTelescopes = (): Promise<Telescope[]> =>
  fetchAPI('/api/telescopes');

export const getTelescope = (id: string): Promise<Telescope> =>
  fetchAPI(`/api/telescopes/${id}`);

export const createTelescope = (input: CreateTelescopeInput): Promise<Telescope> =>
  fetchAPI('/api/telescopes', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateTelescope = (
  id: string,
  input: Partial<CreateTelescopeInput>
): Promise<Telescope> =>
  fetchAPI(`/api/telescopes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteTelescope = (id: string): Promise<void> =>
  fetchAPI(`/api/telescopes/${id}`, { method: 'DELETE' });

// Cameras
export const getCameras = (): Promise<Camera[]> =>
  fetchAPI('/api/cameras');

export const getCamera = (id: string): Promise<Camera> =>
  fetchAPI(`/api/cameras/${id}`);

export const createCamera = (input: CreateCameraInput): Promise<Camera> =>
  fetchAPI('/api/cameras', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateCamera = (
  id: string,
  input: Partial<CreateCameraInput>
): Promise<Camera> =>
  fetchAPI(`/api/cameras/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteCamera = (id: string): Promise<void> =>
  fetchAPI(`/api/cameras/${id}`, { method: 'DELETE' });

// Rigs
export const getRigs = (): Promise<Rig[]> =>
  fetchAPI('/api/rigs');

export const getRig = (id: string): Promise<Rig> =>
  fetchAPI(`/api/rigs/${id}`);

export const createRig = (input: CreateRigInput): Promise<Rig> =>
  fetchAPI('/api/rigs', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateRig = (id: string, input: Partial<CreateRigInput>): Promise<Rig> =>
  fetchAPI(`/api/rigs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteRig = (id: string): Promise<void> =>
  fetchAPI(`/api/rigs/${id}`, { method: 'DELETE' });
