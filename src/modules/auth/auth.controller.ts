import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { apiResponse } from "../../utils/apiResponse";
import { loginService } from "./auth.service";
import { LoginInput } from "./auth.validator";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;

  const result = await loginService(input);

  return apiResponse(res, 200, "Login successful", result);
});
