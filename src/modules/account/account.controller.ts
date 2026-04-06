import { Response } from "express";
import { asyncHandler, apiResponse } from "../../utils";
import { AuthRequest } from "../../middleware";
import { createAccountService } from "./account.service";
import { CreateAccountInput } from "./account.validator";

export const createAccount = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const input = req.body as CreateAccountInput;

    const account = await createAccountService(userId, input);

    return apiResponse(res, 201, "Account created successfully", account);
  },
);
