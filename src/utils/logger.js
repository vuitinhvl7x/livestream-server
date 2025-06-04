// Basic logger
const logger = {
  info: (...args) => console.log("[INFO]", ...args),
  warn: (...args) => console.warn("[WARN]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
  debug: (...args) => {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG === "true"
    ) {
      console.debug("[DEBUG]", ...args);
    }
  },
};

export default logger;
