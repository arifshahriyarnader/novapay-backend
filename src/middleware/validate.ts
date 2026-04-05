import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

export const validate = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(', ');
      return next(new ApiError(400, message));
    }

    req.body = result.data;
    next();
  };
};