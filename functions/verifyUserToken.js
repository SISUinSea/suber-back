const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");

module.exports = onCall({ cors: true }, async (data, context) => {
  logger.info("Received context:", context);

  if (!context || !context.auth) {
    logger.error("No authentication found for incoming request");
    throw new functions.https.HttpsError("unauthenticated", context);
  }

  try {
    const uid = context.auth.uid;
    return { uid: uid };
  } catch (error) {
    logger.error("Error verifying user token:", error);
    throw new functions.https.HttpsError("internal", "Not viable token", error.message);
  }
});
