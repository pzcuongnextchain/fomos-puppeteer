import { Router, Request, Response } from "express";
import { ViewerShipService } from "../../services/viewership/get-broadcase-channel-history.service";

export class ViewershipRouter {
  private router: Router;
  private scraperService: ViewerShipService;

  constructor() {
    this.router = Router();
    this.scraperService = new ViewerShipService();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/get-viewership-statistic",
      this.getViewershipStatistic.bind(this)
    );
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

  getRouter(): Router {
    return this.router;
  }
}
