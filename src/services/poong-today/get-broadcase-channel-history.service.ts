import { Service } from "@prisma/client";
import axios from "axios";
import { prisma } from "../../libs/prisma.libs";

export class GetBroadcaseChannelHistory {
  private readonly apiUrl: string = "https://static.poong.today/sooplive/api";
  private isRunning: boolean = false;

  public async startScraping(
    channelIds?: Array<string>,
    nextId?: string
  ): Promise<
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

    const failedChannels: Array<string> = [];

    await prisma.nServiceCrawl.upsert({
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
      let channels: Array<{ channelId: string }> = [];
      let nextIdWhere: { channelId: { gt: string } } | undefined;
      if (nextId) {
        nextIdWhere = {
          channelId: {
            gt: nextId,
          },
        };
      }

      const date = new Date();
      const today = new Date();

      if (channelIds) {
        const startOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const endOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59,
          999
        );

        channels = await prisma.nChannel.findMany({
          where: {
            channelId: {
              in: channelIds,
            },
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
            ...nextIdWhere,
          },
          distinct: ["channelId"],
          orderBy: {
            channelId: "asc",
          },
          take: 500,
        });
      } else {
        channels = await prisma.nChannel.findMany({
          where: {
            service: Service.POONG_TODAY,
            creationDate: null,
            ...nextIdWhere,
          },
          distinct: ["channelId"],
          orderBy: {
            channelId: "asc",
          },
          take: 500,
        });
      }

      console.log("Channels to process:", channels.length);

      // Process channels in chunks of 10
      for (let i = 0; i < channels.length; i += 10) {
        const channelChunk = channels.slice(i, i + 10);
        const promises = channelChunk.map(async (childChannel) => {
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

            const cumulativeBroadcastTime =
              stationData.station.total_broad_time;
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
              await prisma.nChannel.updateMany({
                where: { channelId: channel.channelId, date: today },
                data: channel,
              });

              if (failedChannels.includes(channelId)) {
                failedChannels.splice(failedChannels.indexOf(channelId), 1);
              }
            }
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
              console.log(
                `Received 403 status for channel ${channelId}, sleeping for 1 minute...`
              );
              await new Promise((resolve) => setTimeout(resolve, 60000));
              console.log(`Resuming after 403 delay for channel ${channelId}`);
              failedChannels.push(channelId);
            } else {
              console.error(`Error processing channel ${channelId}:`, error);
            }
          }
        });

        // Wait for all channels in the chunk to complete
        await Promise.all(promises);
        // Add delay between chunks
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (channels.length === 500) {
        await this.startScraping(
          undefined,
          channels[channels.length - 1].channelId
        );
      }

      if (failedChannels.length > 0) {
        console.log("Failed channels:", failedChannels);
        await this.startScraping(
          failedChannels,
          channels[channels.length - 1].channelId
        );
      }

      return channelList;
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }
}
