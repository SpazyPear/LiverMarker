import { Router, type IRouter } from "express";
import healthRouter from "./health";
import markersRouter from "./markers";
import eventsRouter from "./events";
import debugRouter from "./debug";

const router: IRouter = Router();

router.use(healthRouter);
router.use(markersRouter);
router.use(eventsRouter);
router.use(debugRouter);

export default router;
