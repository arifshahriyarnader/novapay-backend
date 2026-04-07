import { Router } from "express";
import { authenticate, authorize, validate } from "../../middleware";
import { createPayrollJob } from "./payroll.controller";

import { createPayrollJobSchema } from "./payroll.validator";

const router = Router();

router.post(
  "/jobs",
  authenticate,
  authorize("employer"),
  validate(createPayrollJobSchema),
  createPayrollJob,
);

export default router;
