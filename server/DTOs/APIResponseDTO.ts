export interface ApiResponseDto<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  errorDetails?: string;
}
