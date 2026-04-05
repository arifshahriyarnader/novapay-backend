import { Router } from "express";
import { login } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { loginSchema } from "./auth.validator";

const router = Router();

router.post("/login", validate(loginSchema), login);

export default router;
