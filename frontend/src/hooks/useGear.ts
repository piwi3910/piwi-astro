import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Telescope,
  TelescopeCatalog,
  Camera,
  Rig,
  CreateTelescopeInput,
  CreateCameraInput,
  CreateRigInput,
} from '@/types';
import * as gearApi from '@/lib/api/gear';

// Telescope Catalog
export function useTelescopeCatalog(search: string = '', limit: number = 20, offset: number = 0) {
  return useQuery<{ telescopes: TelescopeCatalog[]; total: number; hasMore: boolean }>({
    queryKey: ['telescope-catalog', search, limit, offset],
    queryFn: () => gearApi.searchTelescopeCatalog(search, limit, offset),
    staleTime: 5 * 60 * 1000, // 5 minutes - catalog doesn't change often
  });
}

// Telescopes
export function useTelescopes() {
  return useQuery<Telescope[]>({
    queryKey: ['telescopes'],
    queryFn: gearApi.getTelescopes,
  });
}

export function useCreateTelescope() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gearApi.createTelescope,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telescopes'] });
    },
  });
}

export function useUpdateTelescope() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTelescopeInput> }) =>
      gearApi.updateTelescope(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telescopes'] });
    },
  });
}

export function useDeleteTelescope() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gearApi.deleteTelescope,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telescopes'] });
      queryClient.invalidateQueries({ queryKey: ['rigs'] });
    },
  });
}

// Cameras
export function useCameras() {
  return useQuery<Camera[]>({
    queryKey: ['cameras'],
    queryFn: gearApi.getCameras,
  });
}

export function useCreateCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gearApi.createCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
}

export function useUpdateCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCameraInput> }) =>
      gearApi.updateCamera(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
}

export function useDeleteCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gearApi.deleteCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      queryClient.invalidateQueries({ queryKey: ['rigs'] });
    },
  });
}

// Rigs
export function useRigs() {
  return useQuery<Rig[]>({
    queryKey: ['rigs'],
    queryFn: gearApi.getRigs,
  });
}

export function useCreateRig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gearApi.createRig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rigs'] });
    },
  });
}

export function useUpdateRig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRigInput> }) =>
      gearApi.updateRig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rigs'] });
    },
  });
}

export function useDeleteRig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: gearApi.deleteRig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rigs'] });
    },
  });
}
