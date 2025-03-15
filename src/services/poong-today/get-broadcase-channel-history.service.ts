import { Service } from "@prisma/client";
import axios from "axios";
import { prisma } from "../../libs/prisma.libs";

export class GetBroadcaseChannelHistory {
  private readonly apiUrl: string = "https://static.poong.today/sooplive/api";
  private isRunning: boolean = false;

  public async startScraping(): Promise<
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

    await prisma.serviceCrawl.upsert({
      where: {
        service: Service.POONG_TODAY,
      },
      update: {
        lastCrawledAt: new Date(),
      },
      create: {
        service: Service.POONG_TODAY,
        lastCrawledAt: new Date(),
      },
    });

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

      const channels = await prisma.channel.findMany({
        where: {
          service: Service.POONG_TODAY,
          creationDate: null,
        },
        select: {
          channelId: true,
        },
        take: 500,
      });

      console.log("Channels to process:", channels.length);

      for (const childChannel of channels) {
        const channelId = childChannel.channelId;
        console.log("Processing channel:", channelId);
        try {
          const url = `${this.apiUrl}/${channelId}/station`;
          const stationResponse = await axios.get(url, {
            headers: {
              "Content-Type": "application/json",
              "Accept-Encoding": "gzip",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
            },
          });

          const detailResponse = await axios.get(
            `${this.apiUrl}/${channelId}/station/detail`,
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
            channelId: channelId,
            creationDate: new Date(creationDate),
            recentBroadcastDate: new Date(recentBroadcastDate),
            favorites: favorites,
            cumulativeSubscribers: numberOfSubscribers,
            fanClub: fanClub,
            supporters: supporters,
            cumulativeViewers: cumulativeViewers,
            cumulativeUpCount: cumulativeUpCount,
            cumulativeBroadcastTime: cumulativeBroadcastTime,
            service: Service.POONG_TODAY,
          };

          if (channel.channelId) {
            await prisma.channel.upsert({
              where: { channelId },
              update: channel,
              create: channel,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          // Check if error is an axios error with 403 status
          if (axios.isAxiosError(error) && error.response?.status === 403) {
            console.log(
              `Received 403 status for channel ${channelId}, sleeping for 1 minute...`
            );
            // Sleep for 60 seconds (1 minute)
            await new Promise((resolve) => setTimeout(resolve, 60000));
            console.log(`Resuming after 403 delay for channel ${channelId}`);
          } else {
            console.error(`Error processing channel ${channelId}:`, error);
          }
        }
      }

      return channelList;
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }
}
