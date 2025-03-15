import { Request, Response, Router } from "express";
import { GetBroadcaseChannelHistory } from "../../services/poong-today/get-broadcase-channel-history.service";
import { GetDailyStarBallon } from "../../services/poong-today/get-daily-star-ballon.service";

export class PoongTodayRouter {
  private router: Router;
  private scraperService: GetDailyStarBallon;
  private broadcaseChannelHistory: GetBroadcaseChannelHistory;

  constructor() {
    this.router = Router();
    this.scraperService = new GetDailyStarBallon();
    this.broadcaseChannelHistory = new GetBroadcaseChannelHistory();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/get-daily-star-balloon",
      this.getDailyStarBallon.bind(this)
    );

    this.router.get(
      "/get-broadcase-channel-history",
      this.getBroadcaseChannelHistory.bind(this)
    );
  }

  private async getDailyStarBallon(req: Request, res: Response) {
    try {
      console.log("getDailyStarBallon");
      const result = await this.scraperService.startScraping();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to start scraping" });
    }
  }

  private async getBroadcaseChannelHistory(req: Request, res: Response) {
    try {
      const result = await this.broadcaseChannelHistory.startScraping();
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
