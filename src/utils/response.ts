import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

export const sendSuccess = <T>(res: Response, message: string, data?: T, statusCode = 200): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (res: Response, message: string, statusCode = 400, errorDetails?: any): Response => {
  const payload: ApiResponse = {
    success: false,
    message,
    ...(errorDetails ? { error: errorDetails } : {})
  };
  return res.status(statusCode).json(payload);
};
