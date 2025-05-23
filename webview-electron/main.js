const { app, BrowserWindow, session, ipcMain } = require("electron");

app.commandLine.appendSwitch("remote-debugging-port", "8315");
app.commandLine.appendSwitch("enable-features", "OutOfBlinkCors");
app.commandLine.appendSwitch("disable-site-isolation-trials");
app.commandLine.appendSwitch("--no-sandbox");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: false,
    },
  });

  mainWindow.loadFile("index.html");

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["sec-ch-ua-platform"] = "android";
    details.requestHeaders["x-requested-with"] = "bui.dev.webviewapp";
    details.requestHeaders["viewport-width"] = "400";
    details.requestHeaders["sec-ch-ua-mobile"] = "?1";
    callback({ requestHeaders: details.requestHeaders });
  });

  async function getAndLogCookies() {
    try {
      const cookies = await session.defaultSession.cookies.get({});
      const vcrCookie = cookies.find((cookie) => cookie.name === "_vcrcs");
      if (vcrCookie) {
        console.log("Found _vcrcs cookie in session:", vcrCookie.value);
        ipcMain.emit("cookie-extracted", {}, vcrCookie.value);
      }
    } catch (error) {
      console.error("Error getting cookies:", error);
    }
  }

  async function setCustomCookie() {
    try {
      await session.defaultSession.cookies.set({
        url: "https://viewership.softc.one/",
        name: "webview",
        value: JSON.stringify({ platform: "android" }),
      });
      console.log("Custom cookie set successfully");
    } catch (error) {
      console.error("Error setting cookie:", error);
    }
  }

  async function clearAllCookies() {
    try {
      await session.defaultSession.clearStorageData({
        storages: [
          "cookies",
          "localStorage",
          "sessionStorage",
          "shadercache",
          "websql",
          "serviceworkers",
          "cachestorage",
        ],
        origin: "https://viewership.softc.one",
      });
      console.log("All cookies cleared successfully");

      mainWindow.webContents.send("reload-webview");

      setTimeout(async () => {
        await setCustomCookie();
        getAndLogCookies();
      }, 1000);
    } catch (error) {
      console.error("Error clearing cookies:", error);
    }
  }

  ipcMain.on("webview-loaded", async () => {
    console.log("Page loaded, setting custom cookie...");
    await setCustomCookie();
    console.log("Getting cookies...");
    getAndLogCookies();
  });

  ipcMain.on("clear-cookies", async () => {
    console.log("Clearing all cookies...");
    await clearAllCookies();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
