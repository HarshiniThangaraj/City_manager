import { Request, Response } from "express";
import { ICityRepository } from "../Interfaces/ICityRepository";
import { ApiResponseDto } from "../DTOs/APIResponseDTO";
import { CityCreateDto, CityUpdateDto } from "../DTOs/CityDTOs";

export class CityController {
  private readonly cityRepository: ICityRepository;

  constructor(cityRepository: ICityRepository) {
    this.cityRepository = cityRepository;
  }

  public getCities = async (req: Request, res: Response): Promise<void> => {
    try {
      const search = req.query.search as string | undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const order = (req.query.order as "asc" | "desc") || "asc";
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;

      const data = await this.cityRepository.getCities(search, sortBy, order, page, limit);

      const response: ApiResponseDto = {
        statusCode: 200,
        message: "Cities retrieved successfully",
        data
      };
      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponseDto = {
        statusCode: 500,
        message: "An error occurred while fetching cities",
        errorDetails: error.message || String(error)
      };
      res.status(500).json(response);
    }
  };

  public getCityById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (!id) {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: "Request parameter 'id' is required"
        };
        res.status(400).json(response);
        return;
      }

      const city = await this.cityRepository.getCityById(id);
      if (!city) {
        const response: ApiResponseDto = {
          statusCode: 404,
          message: `City with ID ${id} not found`
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto = {
        statusCode: 200,
        message: "City retrieved successfully",
        data: city
      };
      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponseDto = {
        statusCode: 500,
        message: "An error occurred while retrieving city",
        errorDetails: error.message || String(error)
      };
      res.status(500).json(response);
    }
  };

  public createCity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, country, stateProvince, population, description, isActive } = req.body;

      if (!name || name.trim() === "") {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: "Validation Error: City name is required"
        };
        res.status(400).json(response);
        return;
      }

      if (!country || country.trim() === "") {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: "Validation Error: Country name is required"
        };
        res.status(400).json(response);
        return;
      }

      // Check for case-insensitive duplicates
      const trimmedName = name.trim();
      const existingCity = await this.cityRepository.getCityByName(trimmedName);
      if (existingCity) {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: `Validation Error: A city named '${trimmedName}' already exists (case-insensitive check)`
        };
        res.status(400).json(response);
        return;
      }

      const createDto: CityCreateDto = {
        name: trimmedName,
        country: country.trim(),
        stateProvince: (stateProvince || "").trim(),
        population: parseInt(population) || 0,
        description: (description || "").trim(),
        isActive: isActive !== undefined ? !!isActive : true
      };

      const newCity = await this.cityRepository.createCity(createDto);

      const response: ApiResponseDto = {
        statusCode: 21, // Custom success status or standard 201 
        message: "City created successfully",
        data: newCity
      };
      // For general standards we return 201 response status, but encapsulation handles statusCode beautifully
      res.status(201).json({
        ...response,
        statusCode: 201
      });
    } catch (error: any) {
      const response: ApiResponseDto = {
        statusCode: 500,
        message: "An error occurred while creating city",
        errorDetails: error.message || String(error)
      };
      res.status(500).json(response);
    }
  };

  public updateCity = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const { name, country, stateProvince, population, description, isActive } = req.body;

      if (!id) {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: "Request parameter 'id' is required"
        };
        res.status(400).json(response);
        return;
      }

      if (!name || name.trim() === "") {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: "Validation Error: City name is required"
        };
        res.status(400).json(response);
        return;
      }

      if (!country || country.trim() === "") {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: "Validation Error: Country name is required"
        };
        res.status(400).json(response);
        return;
      }

      // Check duplicate by name (but ensure it doesn't conflict with another city record)
      const trimmedName = name.trim();
      const existingCity = await this.cityRepository.getCityByName(trimmedName);
      if (existingCity && existingCity.id !== id) {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: `Validation Error: Another city named '${trimmedName}' already exists (case-insensitive check)`
        };
        res.status(400).json(response);
        return;
      }

      const updateDto: CityUpdateDto = {
        name: trimmedName,
        country: country.trim(),
        stateProvince: (stateProvince || "").trim(),
        population: parseInt(population) || 0,
        description: (description || "").trim(),
        isActive: isActive !== undefined ? !!isActive : true
      };

      const updatedCity = await this.cityRepository.updateCity(id, updateDto);
      if (!updatedCity) {
        const response: ApiResponseDto = {
          statusCode: 404,
          message: `City with ID ${id} not found`
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto = {
        statusCode: 200,
        message: "City updated successfully",
        data: updatedCity
      };
      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponseDto = {
        statusCode: 500,
        message: "An error occurred while updating city",
        errorDetails: error.message || String(error)
      };
      res.status(500).json(response);
    }
  };

  public deleteCity = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (!id) {
        const response: ApiResponseDto = {
          statusCode: 400,
          message: "Request parameter 'id' is required"
        };
        res.status(400).json(response);
        return;
      }

      const isDeleted = await this.cityRepository.deleteCity(id);
      if (!isDeleted) {
        const response: ApiResponseDto = {
          statusCode: 404,
          message: `City with ID ${id} not found`
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponseDto = {
        statusCode: 200,
        message: "City deleted successfully"
      };
      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponseDto = {
        statusCode: 500,
        message: "An error occurred while deleting city",
        errorDetails: error.message || String(error)
      };
      res.status(500).json(response);
    }
  };
}
