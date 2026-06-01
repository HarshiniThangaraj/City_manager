import fs from "fs/promises";
import path from "path";
import { ICityRepository } from "../Interfaces/ICityRepository";
import { CityEntity } from "../Entities/CityEntity";
import { CityResponseDto, CityCreateDto, CityUpdateDto, CityListResponseDto } from "../DTOs/CityDTOs";

const DB_PATH = path.join(process.cwd(), "server", "database", "cities.json");

export class CityRepository implements ICityRepository {
  private async ensureDatabaseInitialized(): Promise<void> {
    try {
      const dir = path.dirname(DB_PATH);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        await fs.access(DB_PATH);
      } catch {
        // File does not exist, seed initial data
        const initialCities: CityEntity[] = [
          {
            id: "1",
            name: "Tokyo",
            country: "Japan",
            stateProvince: "Tokyo Prefecture",
            population: 13960000,
            description: "Tokyo is Japan's bustling capital, mixing ultramodern neon skyscrapers with historic temples.",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: "2",
            name: "Paris",
            country: "France",
            stateProvince: "Île-de-France",
            population: 2161000,
            description: "Paris, France’s capital, is a major European city and a global center for art, fashion, gastronomy, and culture.",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: "3",
            name: "New York City",
            country: "United States",
            stateProvince: "New York",
            population: 8336000,
            description: "New York City comprises 5 boroughs sitting where the Hudson River meets the Atlantic Ocean.",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: "4",
            name: "London",
            country: "United Kingdom",
            stateProvince: "Greater London",
            population: 8982000,
            description: "London, the capital of England and the United Kingdom, is a 21st-century city with history stretching back to Roman times.",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: "5",
            name: "Bengaluru",
            country: "India",
            stateProvince: "Karnataka",
            population: 8443000,
            description: "Bengaluru (also known as Bangalore) is the center of India's high-tech industry.",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: "6",
            name: "Sydney",
            country: "Australia",
            stateProvince: "New South Wales",
            population: 5312000,
            description: "Sydney, capital of New South Wales and one of Australia's largest cities, is best known for its Sydney Opera House.",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: "7",
            name: "Cape Town",
            country: "South Africa",
            stateProvince: "Western Cape",
            population: 4618000,
            description: "Cape Town is a port city on South Africa’s southwest coast, on a peninsula beneath the imposing Table Mountain.",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: "8",
            name: "Rio de Janeiro",
            country: "Brazil",
            stateProvince: "Rio de Janeiro State",
            population: 6748000,
            description: "Rio de Janeiro is a huge seaside city in Brazil, famed for its Copacabana and Ipanema beaches.",
            isActive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        await fs.writeFile(DB_PATH, JSON.stringify(initialCities, null, 2), "utf-8");
      }
    } catch (error) {
      console.error("Database directory/file preparation failed:", error);
    }
  }

  private async readAllEntities(): Promise<CityEntity[]> {
    await this.ensureDatabaseInitialized();
    try {
      const data = await fs.readFile(DB_PATH, "utf-8");
      return JSON.parse(data) as CityEntity[];
    } catch {
      return [];
    }
  }

  private async writeAllEntities(entities: CityEntity[]): Promise<void> {
    await this.ensureDatabaseInitialized();
    await fs.writeFile(DB_PATH, JSON.stringify(entities, null, 2), "utf-8");
  }

  private mapEntityToResponseDto(entity: CityEntity): CityResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      country: entity.country,
      stateProvince: entity.stateProvince,
      population: entity.population,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  public async getCities(
    search?: string,
    sortBy?: string,
    order: "asc" | "desc" = "asc",
    page: number = 1,
    limit: number = 5
  ): Promise<CityListResponseDto> {
    const list = await this.readAllEntities();
    
    // Apply filters (search on name, country, and stateProvince)
    let filtered = list;
    if (search && search.trim() !== "") {
      const query = search.toLowerCase().trim();
      filtered = list.filter(
        c => c.name.toLowerCase().includes(query) || 
             c.country.toLowerCase().includes(query) ||
             c.stateProvince.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortBy && sortBy.trim() !== "") {
      filtered.sort((a, b) => {
        let valA = (a as any)[sortBy];
        let valB = (b as any)[sortBy];
        
        // Handle undefined or missing fields
        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";
        
        // Convert to lowercase for string-based comparisons
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        
        if (valA < valB) return order === "asc" ? -1 : 1;
        if (valA > valB) return order === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by name ascending
      filtered.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    }
    
    // Apply pagination
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(total / limit) || 1;
    
    return {
      items: paginated.map(this.mapEntityToResponseDto),
      total,
      page,
      limit,
      totalPages
    };
  }

  public async getCityById(id: string): Promise<CityResponseDto | null> {
    const list = await this.readAllEntities();
    const entity = list.find(c => c.id === id);
    if (!entity) return null;
    return this.mapEntityToResponseDto(entity);
  }

  public async getCityByName(name: string): Promise<CityResponseDto | null> {
    const list = await this.readAllEntities();
    const query = name.toLowerCase().trim();
    const entity = list.find(c => c.name.toLowerCase().trim() === query);
    if (!entity) return null;
    return this.mapEntityToResponseDto(entity);
  }

  public async createCity(cityDto: CityCreateDto): Promise<CityResponseDto> {
    const list = await this.readAllEntities();
    
    const newEntity: CityEntity = {
      id: String(Date.now() + Math.floor(Math.random() * 1000)),
      name: cityDto.name.trim(),
      country: cityDto.country.trim(),
      stateProvince: cityDto.stateProvince.trim(),
      population: Number(cityDto.population) || 0,
      description: cityDto.description.trim(),
      isActive: cityDto.isActive !== undefined ? cityDto.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    list.push(newEntity);
    await this.writeAllEntities(list);
    return this.mapEntityToResponseDto(newEntity);
  }

  public async updateCity(id: string, cityDto: CityUpdateDto): Promise<CityResponseDto | null> {
    const list = await this.readAllEntities();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    const original = list[index];
    const updatedEntity: CityEntity = {
      ...original,
      name: cityDto.name.trim(),
      country: cityDto.country.trim(),
      stateProvince: cityDto.stateProvince.trim(),
      population: Number(cityDto.population) || 0,
      description: cityDto.description.trim(),
      isActive: cityDto.isActive,
      updatedAt: new Date().toISOString()
    };
    
    list[index] = updatedEntity;
    await this.writeAllEntities(list);
    return this.mapEntityToResponseDto(updatedEntity);
  }

  public async deleteCity(id: string): Promise<boolean> {
    const list = await this.readAllEntities();
    const filtered = list.filter(c => c.id !== id);
    if (filtered.length === list.length) {
      return false; // City not found
    }
    await this.writeAllEntities(filtered);
    return true;
  }
}
