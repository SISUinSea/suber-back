/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {onRequest} = require("firebase-functions/v2/https");
const {onCall} = require("firebase-functions/v2/https");
const { google } = require('googleapis');

const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started
exports.helloWorld = onCall({cors: true}, (request) => {
  logger.info("Hello logs!", {structuredData: true});
  return {
    message: "Hello World from Firebase Functions!",
  };
});



exports.getYoutubeInfo = onCall(async (data, context) => {
  const accessToken = data.accessToken;
  // const apiKey = functions.config().youtube.apikey;

  // YouTube Data API 사용
  const youtube = google.youtube({ version: 'v3', auth: apiKey });
  const response = await youtube.channels.list({
    part: 'snippet,contentDetails,statistics',
    mine: true,
    access_token: accessToken
  });
  return response.data;
});


