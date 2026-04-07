import { Request, Response } from "express";
import { apiResponse, asyncHandler } from "../../utils";
import { getAllUsersService, getAuditLogsService, getLedgerHealthService } from "./admin.service";

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await getAllUsersService(page, limit);

  return apiResponse(res, 200, "Users fetched successfully", {
    page,
    limit,
    total: result.total,
    totalPages: Math.ceil(result.total / limit),
    data: result.data,
  });
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const logs = await getAuditLogsService();

  return apiResponse(res, 200, "Audit logs fetched successfully", logs);
});

export const getLedgerHealth = asyncHandler(async (req, res: Response) => {
  const health = await getLedgerHealthService();

  return apiResponse(
    res,
    200,
    health.isHealthy
      ? "Ledger is healthy"
      : "Ledger invariant violation detected",
    health
  );
});