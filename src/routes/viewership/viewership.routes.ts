import { Request, Response, Router } from "express";
import { ViewerShipService } from "../../services/viewership/get-broadcase-channel-history.service";
import { DailySubscribeViewerShipService } from "../../services/viewership/get-daily-subscribe.service";
export class ViewershipRouter {
  private router: Router;
  private scraperService: ViewerShipService;
  private dailySubscribeScraperService: DailySubscribeViewerShipService;

  constructor() {
    this.router = Router();
    this.scraperService = new ViewerShipService();
    this.dailySubscribeScraperService = new DailySubscribeViewerShipService();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/get-viewership-statistic",
      this.getViewershipStatistic.bind(this)
    );
    this.router.post("/get-daily-subscribe", this.getDailySubscribe.bind(this));
  }

  private async getViewershipStatistic(req: Request, res: Response) {
    try {
      const result = await this.scraperService.startScraping();
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  }

  private async getDailySubscribe(req: Request, res: Response) {
    try {
      const result = await this.dailySubscribeScraperService.startScraping(
        req.body.channelIds
      );
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  }

  getRouter(): Router {
    return this.router;
  }
}
