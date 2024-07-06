const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require('googleapis');
const { getUserTokens, refreshAccessToken, storeUserTokens } = require('./utils');


exports.createYoutubePlaylist = functions.https.onCall(async (data, context) => {
  const idToken = data.idToken;
  const playlistTitle = data.playlistTitle;

  if (!idToken || !playlistTitle) {
    throw new functions.https.HttpsError('invalid-argument', 'ID token and playlist title are required');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userData = await getUserTokens(uid);
    let accessToken = userData.accessToken;

    if (Date.now() > userData.tokenExpiry) {
      accessToken = await refreshAccessToken(userData.refreshToken);
      await storeUserTokens(uid, accessToken, userData.refreshToken);
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.playlists.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: playlistTitle,
          description: 'A new playlist created via Firebase Functions',
        },
        status: {
          privacyStatus: 'private',
        },
      },
    });

    return { data: response.data };
  } catch (error) {
    console.error('Error creating YouTube playlist:', error);
    throw new functions.https.HttpsError('internal', 'Error creating YouTube playlist', error.message);
  }
});