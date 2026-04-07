import { Request, Response } from "express";
import { apiResponse, asyncHandler } from "../../utils";
import {
  getAllTransactionsService,
  getAllUsersService,
  getAuditLogsService,
} from "./admin.service";
import { AuthRequest } from "../../middleware";

export const getAllUsers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await getAllUsersService(page, limit);
    return apiResponse(res, 200, "Users fetched successfully", result);
  },
);

export const getAuditLogs = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const logs = await getAuditLogsService();
    return apiResponse(res, 200, "Audit logs fetched successfully", logs);
  },
);

export const getAllTransactions = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const result = await getAllTransactionsService();
    return apiResponse(res, 200, "Transactions fetched successfully", result);
  },
);
