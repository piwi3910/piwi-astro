import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Telescope,
  TelescopeCatalog,
  Camera,
  CameraCatalog,
  Rig,
  CreateTelescopeInput,
  CreateCameraInput,
  CreateRigInput,
} from '@/types';
import * as gearApi from '@/lib/api/gear';

// Telescope Catalog
export function useTelescopeBrands() {
  return useQuery<{ brands: string[] }>({
    queryKey: ['telescope-brands'],
    queryFn: gearApi.getTelescopeBrands,
    staleTime: 10 * 60 * 1000, // 10 minutes - brands rarely change
  });
}

export function useTelescopesByBrand(brand: string | null, limit: number = 100, offset: number = 0) {
  return useQuery<{ telescopes: TelescopeCatalog[]; total: number; hasMore: boolean }>({
    queryKey: ['telescope-catalog', 'by-brand', brand, limit, offset],
    queryFn: () => gearApi.getTelescopesByBrand(brand!, limit, offset),
    enabled: !!brand, // Only fetch when brand is selected
    staleTime: 5 * 60 * 1000, // 5 minutes - catalog doesn't change often
  });
}

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

// Camera Catalog
export function useCameraBrands() {
  return useQuery<{ brands: string[] }>({
    queryKey: ['camera-brands'],
    queryFn: gearApi.getCameraBrands,
    staleTime: 10 * 60 * 1000, // 10 minutes - brands rarely change
  });
}

export function useCamerasByBrand(brand: string | null, limit: number = 100, offset: number = 0) {
  return useQuery<{ cameras: CameraCatalog[]; total: number; hasMore: boolean }>({
    queryKey: ['camera-catalog', 'by-brand', brand, limit, offset],
    queryFn: () => gearApi.getCamerasByBrand(brand!, limit, offset),
    enabled: !!brand, // Only fetch when brand is selected
    staleTime: 5 * 60 * 1000, // 5 minutes - catalog doesn't change often
  });
}

export function useCameraCatalog(search: string = '', limit: number = 20, offset: number = 0) {
  return useQuery<{ cameras: CameraCatalog[]; total: number; hasMore: boolean }>({
    queryKey: ['camera-catalog', search, limit, offset],
    queryFn: () => gearApi.searchCameraCatalog(search, limit, offset),
    staleTime: 5 * 60 * 1000, // 5 minutes - catalog doesn't change often
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
