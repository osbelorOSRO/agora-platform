import { Router } from "express";
import { issueServiceToken } from "../controllers/ServiceAuthController.js";

const router = Router();

router.post("/service-token", issueServiceToken);

export default router;
