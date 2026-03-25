import { Router, type IRouter } from "express";
import healthRouter from "./health";
import markersRouter from "./markers";
import eventsRouter from "./events";

const router: IRouter = Router();

router.use(healthRouter);
router.use(markersRouter);
router.use(eventsRouter);

export default router;
