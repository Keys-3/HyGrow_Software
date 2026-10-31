import express from "express";
import { growthPrediction } from "../controllers/growthController.js";
import { requireAuth } from '../middleware/auth.js';
const router = express.Router();
router.use(requireAuth);

router.post("/", growthPrediction);

export default router;
