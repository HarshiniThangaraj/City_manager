import { CityResponseDto, CityCreateDto, CityUpdateDto, CityListResponseDto } from "../DTOs/CityDTOs";

export interface ICityRepository {
  getCities(
    search?: string,
    sortBy?: string,
    order?: "asc" | "desc",
    page?: number,
    limit?: number
  ): Promise<CityListResponseDto>;
  
  getCityById(id: string): Promise<CityResponseDto | null>;
  
  getCityByName(name: string): Promise<CityResponseDto | null>;
  
  createCity(cityDto: CityCreateDto): Promise<CityResponseDto>;
  
  updateCity(id: string, cityDto: CityUpdateDto): Promise<CityResponseDto | null>;
  
  deleteCity(id: string): Promise<boolean>;
}
