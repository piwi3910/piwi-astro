export interface JWTPayload {
  userId: string;
  email: string;
}

export interface FOVCalculation {
  fovWidthArcmin: number;
  fovHeightArcmin: number;
  pixelScaleArcsecPerPixel: number;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    username: string;
  };
}
