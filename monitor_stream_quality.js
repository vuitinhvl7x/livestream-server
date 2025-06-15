// monitor_stream_quality.js
import { StreamsInfo, FramesMonitor, processFrames } from "video-quality-tools";
import path from "path";

// --- CONFIGURATION ---
const FFPROBE_PATH =
  "D:/exe/ffmpeg-master-latest-win64-gpl-shared/bin/ffprobe.exe";
const MEDIA_SERVER_URL = "http://192.168.0.200:8080";
const STREAM_KEY = "cd9d88ef-0d60-4123-803f-38c1d49c4a9d";
const HLS_URL = `${MEDIA_SERVER_URL}/hls/${STREAM_KEY}.m3u8`;
const ANALYSIS_INTERVAL_MS = 5000; // Phân tích mỗi 5 giây
const FFPROBE_TIMEOUT_MS = 10000; // Thời gian chờ ffprobe là 10 giây

console.log(`🚀 Bắt đầu giám sát chất lượng stream cho: ${HLS_URL}`);

/**
 * Lấy thông tin cơ bản của stream một lần khi khởi động.
 */
async function fetchStreamInfo() {
  console.log("\n--- 1. Lấy thông tin ban đầu của Stream ---");
  try {
    const streamsInfo = new StreamsInfo(
      { ffprobePath: FFPROBE_PATH, timeoutInMs: FFPROBE_TIMEOUT_MS },
      HLS_URL
    );
    const info = await streamsInfo.fetch();
    console.log("✅ Thông tin Stream ban đầu đã nhận:");
    console.log(JSON.stringify(info, null, 2));
  } catch (error) {
    console.error("❌ Lỗi khi lấy thông tin stream ban đầu:", error.message);
    console.warn(
      "   (Lỗi này có thể xảy ra khi stream vừa bắt đầu. Trình giám sát sẽ tiếp tục.)"
    );
  }
}

/**
 * Giám sát chất lượng stream liên tục theo thời gian thực.
 */
function monitorRealtimeQuality() {
  console.log("\n--- 2. Bắt đầu giám sát chất lượng Real-time ---");
  const framesMonitor = new FramesMonitor(
    {
      ffprobePath: FFPROBE_PATH,
      timeoutInMs: FFPROBE_TIMEOUT_MS,
      bufferMaxLengthInBytes: 1024 * 1024 * 5, // Tăng buffer lên 5MB
      errorLevel: "error",
      exitProcessGuardTimeoutInMs: 2000,
      analyzeDurationInMs: 9000,
    },
    HLS_URL
  );

  let collectedFrames = [];

  // Lắng nghe từng frame
  framesMonitor.on("frame", (frame) => {
    collectedFrames.push(frame);
  });

  // Lắng nghe lỗi từ tiến trình monitor
  framesMonitor.on("error", (error) => {
    console.error("❌ Lỗi từ FramesMonitor:", error.message);
  });

  framesMonitor.on("end", () => {
    console.log("ℹ️ Tiến trình FramesMonitor đã kết thúc.");
  });

  // Phân tích các frame đã thu thập theo định kỳ
  const analysisInterval = setInterval(() => {
    if (collectedFrames.length === 0) {
      console.log(
        `[${new Date().toLocaleTimeString()}] ⏳ Không nhận được frame nào trong ${
          ANALYSIS_INTERVAL_MS / 1000
        } giây qua. Đang chờ stream...`
      );
      return;
    }

    try {
      const stats = processFrames.networkStats(
        collectedFrames,
        ANALYSIS_INTERVAL_MS
      );

      console.log(
        `\n--- 📊 Thống kê Real-time (${new Date().toLocaleTimeString()}) ---`
      );

      // Kiểm tra thuộc tính trước khi truy cập để tránh lỗi
      if (stats.videoBitrate !== undefined) {
        console.log(`  Bitrate (Video): ${stats.videoBitrate.toFixed(2)} kbps`);
      }
      if (stats.videoFrameRate !== undefined) {
        console.log(
          `  Frame Rate (Video): ${stats.videoFrameRate.toFixed(2)} fps`
        );
      }
      if (stats.audioBitrate !== undefined) {
        console.log(`  Bitrate (Audio): ${stats.audioBitrate.toFixed(2)} kbps`);
      }
      console.log(`  Tổng số Frame trong chu kỳ: ${collectedFrames.length}`);

      // Reset lại mảng frame cho chu kỳ tiếp theo
      collectedFrames = [];
    } catch (err) {
      console.error(`❌ Lỗi trong quá trình phân tích frame: ${err.message}`);
    }
  }, ANALYSIS_INTERVAL_MS);

  // Bắt đầu lắng nghe stream
  framesMonitor.listen();

  // Hàm dừng mượt mà
  const shutdown = async () => {
    console.log("\n gracefully shutting down...");
    clearInterval(analysisInterval);
    try {
      await framesMonitor.stopListen();
      console.log("✅ Trình giám sát đã dừng thành công.");
      process.exit(0);
    } catch (e) {
      console.error("❌ Lỗi khi dừng trình giám sát:", e.message);
      process.exit(1);
    }
  };

  // Bắt sự kiện Ctrl+C
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// --- Chạy các hàm giám sát ---
async function main() {
  await fetchStreamInfo();
  monitorRealtimeQuality();
}

main();
