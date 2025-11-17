import { api } from '../api';
import type {
  Telescope,
  Camera,
  Rig,
  CreateTelescopeInput,
  CreateCameraInput,
  CreateRigInput,
} from '@/types';

// Telescopes
export const getTelescopes = async (): Promise<Telescope[]> => {
  const { data } = await api.get('/api/telescopes');
  return data;
};

export const getTelescope = async (id: string): Promise<Telescope> => {
  const { data } = await api.get(`/api/telescopes/${id}`);
  return data;
};

export const createTelescope = async (input: CreateTelescopeInput): Promise<Telescope> => {
  const { data } = await api.post('/api/telescopes', input);
  return data;
};

export const updateTelescope = async (
  id: string,
  input: Partial<CreateTelescopeInput>
): Promise<Telescope> => {
  const { data } = await api.put(`/api/telescopes/${id}`, input);
  return data;
};

export const deleteTelescope = async (id: string): Promise<void> => {
  await api.delete(`/api/telescopes/${id}`);
};

// Cameras
export const getCameras = async (): Promise<Camera[]> => {
  const { data } = await api.get('/api/cameras');
  return data;
};

export const getCamera = async (id: string): Promise<Camera> => {
  const { data } = await api.get(`/api/cameras/${id}`);
  return data;
};

export const createCamera = async (input: CreateCameraInput): Promise<Camera> => {
  const { data } = await api.post('/api/cameras', input);
  return data;
};

export const updateCamera = async (
  id: string,
  input: Partial<CreateCameraInput>
): Promise<Camera> => {
  const { data } = await api.put(`/api/cameras/${id}`, input);
  return data;
};

export const deleteCamera = async (id: string): Promise<void> => {
  await api.delete(`/api/cameras/${id}`);
};

// Rigs
export const getRigs = async (): Promise<Rig[]> => {
  const { data } = await api.get('/api/rigs');
  return data;
};

export const getRig = async (id: string): Promise<Rig> => {
  const { data } = await api.get(`/api/rigs/${id}`);
  return data;
};

export const createRig = async (input: CreateRigInput): Promise<Rig> => {
  const { data } = await api.post('/api/rigs', input);
  return data;
};

export const updateRig = async (id: string, input: Partial<CreateRigInput>): Promise<Rig> => {
  const { data} = await api.put(`/api/rigs/${id}`, input);
  return data;
};

export const deleteRig = async (id: string): Promise<void> => {
  await api.delete(`/api/rigs/${id}`);
};
