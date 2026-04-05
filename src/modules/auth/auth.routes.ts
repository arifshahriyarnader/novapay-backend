import { Router } from "express";
import { login } from "./auth.controller";
import { loginRateLimiter, validate } from "../../middleware";
import { loginSchema } from "./auth.validator";

const router = Router();

router.post("/login", loginRateLimiter, validate(loginSchema), login);

export default router;
