const { ipcRenderer } = require("electron");

// Function to get the _vcrcs cookie
function getCookie() {
  try {
    const cookies = document.cookie.split(";");
    let vcrCookie = null;

    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "_vcrcs") {
        vcrCookie = value;
        break;
      }
    }

    if (vcrCookie) {
      ipcRenderer.sendToHost("cookie-extracted", vcrCookie);
    }
  } catch (error) {
    ipcRenderer.sendToHost("cookie-extracted", { error: error.message });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // This script runs in the WebView context
  console.log("Preload script loaded");
});
