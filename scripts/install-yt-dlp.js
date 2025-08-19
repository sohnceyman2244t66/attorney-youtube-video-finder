// Post-install script to set up yt-dlp on deployment
import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";

const execAsync = promisify(exec);

async function installYtDlp() {
  console.log("Setting up yt-dlp...");

  if (platform() === "win32") {
    console.log("Windows detected - yt-dlp.exe should be in bin/ folder");
    return;
  }

  try {
    // Check if yt-dlp is already installed
    await execAsync("which yt-dlp");
    console.log("yt-dlp is already installed");
  } catch (error) {
    console.log("Installing yt-dlp...");
    try {
      // Try to install via pip (most cloud platforms have Python)
      await execAsync("pip install -U yt-dlp || pip3 install -U yt-dlp");
      console.log("yt-dlp installed successfully via pip");
    } catch (pipError) {
      console.log("Could not install via pip, trying apt...");
      try {
        // Try apt for Debian/Ubuntu based systems
        await execAsync("apt-get update && apt-get install -y yt-dlp");
        console.log("yt-dlp installed successfully via apt");
      } catch (aptError) {
        console.log("Warning: Could not install yt-dlp automatically");
        console.log("Please install it manually: pip install yt-dlp");
      }
    }
  }
}

installYtDlp().catch(console.error);
