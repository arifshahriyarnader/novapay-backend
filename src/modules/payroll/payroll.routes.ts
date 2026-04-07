import { Router } from "express";
import { authenticate, authorize, validate } from "../../middleware";
import {
  createPayrollJob,
  getPayrollJob,
  getPayrollJobReport,
} from "./payroll.controller";

import { createPayrollJobSchema } from "./payroll.validator";

const router = Router();

router.post(
  "/jobs",
  authenticate,
  authorize("employer"),
  validate(createPayrollJobSchema),
  createPayrollJob,
);

router.get(
  "/jobs/:id/report",
  authenticate,
  authorize("employer"),
  getPayrollJobReport,
);

router.get("/jobs/:id", authenticate, authorize("employer"), getPayrollJob);

export default router;
