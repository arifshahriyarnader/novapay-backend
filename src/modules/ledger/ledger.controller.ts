import { Response } from "express";
import { apiResponse, asyncHandler } from "../../utils";
import { AuthRequest } from "../../middleware";
import { getLedgerEntriesService } from "./ledger.service";

export const getLedgerEntries = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const accountId = req.params["accountId"] as string;
    const result = await getLedgerEntriesService(accountId, userId);
    return apiResponse(res, 200, "Ledger entries fetched successfully", result);
  },
);
