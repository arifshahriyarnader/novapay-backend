import { Response } from "express";
import { apiResponse, asyncHandler } from "../../utils";
import { AuthRequest } from "../../middleware";
import {
  createPayrollJobService,
  getPayrollJobReportService,
  getPayrollJobService,
} from "./payroll.service";
import { CreatePayrollJobInput } from "./payroll.validator";

export const createPayrollJob = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const input = req.body as CreatePayrollJobInput;
    const result = await createPayrollJobService(userId, input);
    return apiResponse(res, 201, "Payroll job created successfully", result);
  },
);

export const getPayrollJob = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params["id"] as string;
    const result = await getPayrollJobService(id, userId);
    return apiResponse(res, 200, "Payroll job fetched successfully", result);
  },
);

export const getPayrollJobReport = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params["id"] as string;
    const result = await getPayrollJobReportService(id, userId);
    return apiResponse(res, 200, "Payroll report fetched successfully", result);
  },
);
