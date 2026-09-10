export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
  gender: number;
  role: 'Passenger' | 'Driver';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  gender: string;
  isVerified: boolean;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiration: string;
  user: UserDto;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}
