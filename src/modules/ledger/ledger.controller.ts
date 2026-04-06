import { Response } from "express";
import { apiResponse, asyncHandler } from "../../utils";
import { AuthRequest } from "../../middleware";
import {
  getLedgerEntriesService,
  verifyDoubleEntryService,
} from "./ledger.service";

export const getLedgerEntries = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const accountId = req.params["accountId"] as string;
    const result = await getLedgerEntriesService(accountId, userId);
    return apiResponse(res, 200, "Ledger entries fetched successfully", result);
  },
);

export const verifyDoubleEntry = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const transactionId = req.params["transactionId"] as string;

    const result = await verifyDoubleEntryService(transactionId, userId);

    return apiResponse(
      res,
      200,
      result.isValid
        ? "Invariant check passed"
        : "INVARIANT VIOLATION DETECTED",
      result,
    );
  },
);
