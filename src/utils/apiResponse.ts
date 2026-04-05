import { Response } from 'express';

export const apiResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown
) => {
  return res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data: data ?? null,
  });
};