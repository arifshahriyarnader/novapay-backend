import { Response } from "express";
import { apiResponse, asyncHandler } from "../../utils";
import { AuthRequest } from "../../middleware";
import { createPayrollJobService } from "./payroll.service";
import { CreatePayrollJobInput } from "./payroll.validator";


export const createPayrollJob = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const input = req.body as CreatePayrollJobInput;
    const result = await createPayrollJobService(userId, input);
    return apiResponse(res, 201, "Payroll job created successfully", result);
  },
);
