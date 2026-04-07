import { Response } from "express";
import { asyncHandler, apiResponse } from "../../utils";
import { AuthRequest } from "../../middleware";
import { checkQuoteService, lockRateService } from "./fx.service";
import { LockRateInput } from "./fx.validator";

export const lockRate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const input = req.body as LockRateInput;
    const result = await lockRateService(userId, input);
    return apiResponse(res, 201, "FX rate locked successfully", result);
  },
);

export const checkQuote = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params['id'] as string;
    const result = await checkQuoteService(id, userId);
    return apiResponse(res, 200, 'Quote validity checked', result);
  }
);