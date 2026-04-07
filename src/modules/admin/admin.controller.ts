import { Request, Response } from "express";
import { apiResponse, asyncHandler } from "../../utils";
import {
  getAllPayrollJobsService,
  getAllTransactionsService,
  getAllUsersService,
  getAuditLogsService,
  getLedgerHealthService,
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

export const getLedgerHealth = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const result = await getLedgerHealthService();
    return apiResponse(
      res,
      result.isHealthy ? 200 : 500,
      result.message,
      result,
    );
  },
);

export const getAllPayrollJobs = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const result = await getAllPayrollJobsService();
    return apiResponse(res, 200, "Payroll jobs fetched successfully", result);
  },
);
