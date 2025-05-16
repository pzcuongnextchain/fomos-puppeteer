import bodyParser from "body-parser";
import express, { Express } from "express";
import { PlayboardCoRouter } from "./routes/playboard-co/playboard-co.routes";
import { PoongTodayRouter } from "./routes/poong-today/poong-today.routes";
import { ViewershipRouter } from "./routes/viewership/viewership.routes";
import { YoutubeRouter } from "./routes/youtube/youtube.routes";
import { CronService } from "./services/cron/cron.service";

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const poongTodayRouter = new PoongTodayRouter();
app.use("/poong-today", poongTodayRouter.getRouter());

const playboardCoRouter = new PlayboardCoRouter();
app.use("/playboard-co", playboardCoRouter.getRouter());

const viewershipRouter = new ViewershipRouter();
app.use("/viewership", viewershipRouter.getRouter());

const youtubeRouter = new YoutubeRouter();
app.use("/youtube", youtubeRouter.getRouter());

// Initialize and start the cron service
const cronService = new CronService();
cronService.startCronJobs();

app.listen(port, () =>
  console.log(`Data scraper app listening on port ${port}!`)
);
