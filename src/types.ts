export interface City {
  id: string;
  name: string;
  country: string;
  stateProvince: string;
  population: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CityFormData {
  name: string;
  country: string;
  stateProvince: string;
  population: number;
  description: string;
  isActive: boolean;
}

export interface CityListResponse {
  items: City[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  errorDetails?: string;
}
