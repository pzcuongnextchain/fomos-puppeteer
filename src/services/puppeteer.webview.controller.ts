import { ChildProcess, spawn } from "child_process";
import electronPath from "electron";
import path from "path";
import * as puppeteer from "puppeteer";

export class PuppeteerWebViewController {
  public _vcrcsCookie: string | null = null;
  private _webviewCookie: string | null = null;
  private electronProcess: ChildProcess | null = null;
  private readonly maxConnectionAttempts: number;

  constructor(maxAttempts: number = 5) {
    this.maxConnectionAttempts = maxAttempts;
  }

  /**
   * Launches Electron and extracts the _vcrcs cookie using Puppeteer
   * @returns Promise resolving to the cookie string or null if unsuccessful
   */
  public async launchAndGetCookie(): Promise<string | null> {
    try {
      await this.startElectronApp();
      await this.waitForAppToStart(3000);

      return await this.connectWithPuppeteer();
    } catch (error) {
      console.error("Error in launch and get cookie:", error);
      this.cleanup();
      return null;
    }
  }

  /**
   * Starts the Electron application process
   */
  private startElectronApp(): void {
    console.log("Starting Electron app...");
    this.electronProcess = spawn(
      electronPath as unknown as string,
      [path.join(__dirname, "../../webview-electron")],
      {
        stdio: "pipe",
      }
    );

    this.setupProcessListeners();
  }

  /**
   * Sets up stdout and stderr listeners for the Electron process
   */
  private setupProcessListeners(): void {
    if (!this.electronProcess) return;

    this.electronProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      console.log(`Electron stdout: ${output}`);

      // Look for the _vcrcs cookie in the logs
      if (output.includes("Found _vcrcs cookie in session:")) {
        this._vcrcsCookie = output
          .split("Found _vcrcs cookie in session:")[1]
          .trim();
        console.log("Extracted cookie from logs:", this._vcrcsCookie);
      }
    });

    this.electronProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`Electron stderr: ${data.toString()}`);
    });
  }

  /**
   * Creates a delay to wait for the app to initialize
   */
  private waitForAppToStart(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Attempts to connect to the running Electron app with Puppeteer
   * to extract the _vcrcs cookie
   */
  private async connectWithPuppeteer(): Promise<string | null> {
    let connectionAttempts = 0;

    while (connectionAttempts < this.maxConnectionAttempts) {
      try {
        console.log(
          `Connection attempt ${connectionAttempts + 1}/${
            this.maxConnectionAttempts
          }...`
        );

        // Connect Puppeteer to Electron
        console.log("Connecting Puppeteer to Electron...");
        const browser = await puppeteer
          .connect({
            browserURL: "http://localhost:8315",
            defaultViewport: null,
          })
          .catch((error: Error) => {
            console.log(`Connection error: ${error.message}`);
            throw error;
          });

        console.log("Successfully connected to Electron with Puppeteer");

        const pages = await browser.pages();
        const page = pages[0];

        // If we already have the cookie from stdout, return it
        if (this._vcrcsCookie) {
          await browser.disconnect();
          this.cleanup();
          return this._vcrcsCookie;
        }

        // Try to extract cookies using Puppeteer's CDP
        try {
          const cdpSession = await page.target().createCDPSession();
          const cookies = await cdpSession.send("Network.getAllCookies");

          const vcrCookie = cookies.cookies.find(
            (c: { name: string; value: string }) => c.name === "_vcrcs"
          );

          if (vcrCookie) {
            console.log("Found _vcrcs cookie using CDP:", vcrCookie.value);
            this._vcrcsCookie = vcrCookie.value;
          } else {
            console.log("Cookie not found in CDP results");
          }
        } catch (cdpError) {
          console.error("Error with CDP:", cdpError);
        }

        // Wait for additional time to collect cookies
        await this.waitForAppToStart(5000);

        await browser.disconnect();
        this.cleanup();
        return this._vcrcsCookie;
      } catch (error) {
        console.log(
          `Connection attempt ${connectionAttempts + 1} failed: ${
            (error as Error).message
          }`
        );
        connectionAttempts++;
        await this.waitForAppToStart(2000);
      }
    }

    console.log("Failed to connect with Puppeteer after multiple attempts");

    // Even if Puppeteer connection fails, we might have gotten the cookie from stdout
    if (this._vcrcsCookie) {
      return this._vcrcsCookie;
    }

    this.cleanup();
    return null;
  }

  /**
   * Cleans up resources by killing the Electron process
   */
  public cleanup(): void {
    if (this.electronProcess) {
      this.electronProcess.kill();
      this.electronProcess = null;
    }
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  const controller = new PuppeteerWebViewController();
  controller
    .launchAndGetCookie()
    .then((cookie: string | null) => {
      if (cookie) {
        console.log("Success! Extracted cookie:", cookie);
        process.exit(0);
      } else {
        console.log("Failed to extract cookie");
        process.exit(1);
      }
    })
    .catch((error: Error) => {
      console.error("Puppeteer controller error:", error);
      process.exit(1);
    })
    .finally(() => {
      controller.cleanup();
    });
}
