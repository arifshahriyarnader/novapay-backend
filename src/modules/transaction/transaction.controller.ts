import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { apiResponse } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware";
import { transferService } from "./transaction.service";
import { TransferInput } from "./transaction.validator";

export const transfer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const input = req.body as TransferInput;
    const result = await transferService(userId, input);
    return apiResponse(res, 201, "Transfer successful", result);
  },
);
