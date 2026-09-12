import { Router } from "express";
import { chatController } from "../controllers/chat.controller";

const router = Router();

router.post("/recommendations", (req, res, next) => chatController.recommend(req, res, next));

export default router;
