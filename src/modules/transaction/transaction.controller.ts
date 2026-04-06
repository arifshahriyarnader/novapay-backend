import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { apiResponse } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware";
import {
  getTransactionHistoryService,
  getTransactionService,
  reverseTransactionService,
  transferService,
} from "./transaction.service";
import { TransferInput } from "./transaction.validator";

export const transfer = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const input = req.body as TransferInput;
    const result = await transferService(userId, input);
    return apiResponse(res, 201, "Transfer successful", result);
  },
);

export const getTransaction = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params["id"] as string;
    const result = await getTransactionService(id, userId);
    return apiResponse(res, 200, "Transaction fetched successfully", result);
  },
);

export const getTransactionHistory = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const result = await getTransactionHistoryService(userId);
    return apiResponse(
      res,
      200,
      "Transaction history fetched successfully",
      result,
    );
  },
);

export const reverseTransaction = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params['id'] as string;
    const result = await reverseTransactionService(id, userId);
    return apiResponse(res, 200, 'Transaction reversed successfully', result);
  }
);