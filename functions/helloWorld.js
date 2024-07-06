const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

module.exports = onCall({ cors: true }, (request) => {
  logger.info("Hello logs!", { structuredData: true });
  return {
    message: "Hello World from Firebase Functions!",
  };
});
