export interface CityResponseDto {
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

export interface CityCreateDto {
  name: string;
  country: string;
  stateProvince: string;
  population: number;
  description: string;
  isActive?: boolean;
}

export interface CityUpdateDto {
  name: string;
  country: string;
  stateProvince: string;
  population: number;
  description: string;
  isActive: boolean;
}

export interface CityListResponseDto {
  items: CityResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
