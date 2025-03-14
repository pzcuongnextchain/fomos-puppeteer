import axios from "axios";

export class GetBroadcaseChannelHistory {
  private readonly apiUrl: string = "https://static.poong.today/sooplive/api";
  private isRunning: boolean = false;

  public async startScraping(userIds: Array<string>): Promise<
    Array<{
      id: string;
      creationDate: string;
      recentBroadcastDate: string;
      favorites: number;
      numberOfSubscribers: number;
      fanClub: number;
      supporters: number;
      cumulativeViewers: number;
      cumulativeUpCount: number;
      cumulativeBroadcastTime: number;
    }>
  > {
    if (this.isRunning) throw new Error("Scraper is already running");

    try {
      const channelList: Array<{
        id: string;
        creationDate: string;
        recentBroadcastDate: string;
        favorites: number;
        numberOfSubscribers: number;
        fanClub: number;
        supporters: number;
        cumulativeViewers: number;
        cumulativeUpCount: number;
        cumulativeBroadcastTime: number;
      }> = [];

      for (const userId of userIds) {
        const url = `${this.apiUrl}/${userId}/station`;
        const stationResponse = await axios.get(url, {
          headers: {
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
          },
        });

        const detailResponse = await axios.get(
          `${this.apiUrl}/${userId}/station/detail`,
          {
            headers: {
              "Content-Type": "application/json",
              "Accept-Encoding": "gzip",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
            },
          }
        );

        const stationData = stationResponse.data;
        const detailData = detailResponse.data;
        const creationDate = stationData.station.jointime;
        const recentBroadcastDate = stationData.station.broad_start;
        const favorites = stationData.station.upd.fan_cnt;
        const numberOfSubscribers = stationData.subscription.total;
        const cumulativeViewers = stationData.station.upd.total_view_cnt;
        const cumulativeUpCount = stationData.station.upd.total_ok_cnt;

        const cumulativeBroadcastTime = stationData.station.total_broad_time;
        const fanClub = detailData.count.fanclub;
        const supporters = detailData.count.supporter;

        const channel = {
          id: userId,
          creationDate: creationDate,
          recentBroadcastDate: recentBroadcastDate,
          favorites: favorites,
          numberOfSubscribers: numberOfSubscribers,
          fanClub: fanClub,
          supporters: supporters,
          cumulativeViewers: cumulativeViewers,
          cumulativeUpCount: cumulativeUpCount,
          cumulativeBroadcastTime: cumulativeBroadcastTime,
        };

        channelList.push(channel);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return channelList;
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }
}
