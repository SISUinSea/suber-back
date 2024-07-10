const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { google } = require('googleapis');
const admin = require("firebase-admin");
const { getUserTokens, refreshAccessToken, storeUserTokens } = require('./utils');

// Firebase Admin 초기화
if (admin.apps.length === 0) {
  admin.initializeApp();
}

module.exports = onCall(async (data, context) => {
  console.log('Function called with data:', data);

  const idToken = data.data.idToken;
  const channelId = data.data.channelId;
  const pageToken = data.data.pageToken || "";

  if (!idToken) {
    console.error('ID token is missing');
    throw new HttpsError('invalid-argument', 'ID token is required');
  }

  if (!channelId) {
    console.error('Channel ID is missing');
    throw new HttpsError('invalid-argument', 'Channel ID is required');
  }

  try {
    console.log('Verifying ID token...');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    console.log('ID token verified. UID:', uid);

    console.log('Fetching user tokens from Firestore...');
    const userData = await getUserTokens(uid);
    let accessToken = userData.accessToken;
    console.log('User data:', userData);

    if (Date.now() > userData.tokenExpiry) {
      console.log('Access token expired. Refreshing token...');
      console.log('expired accessToken is : ', accessToken);
      accessToken = await refreshAccessToken(userData.refreshToken);
      await storeUserTokens(uid, accessToken, userData.refreshToken);
      console.log('Access token refreshed:', accessToken);
    } else {
      console.log('Access token is still valid:', accessToken);
    }

    console.log('Setting up YouTube API client...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    console.log('Fetching channel videos from YouTube API...');
    const response = await youtube.search.list({
      part: 'snippet',
      channelId: channelId,
      maxResults: 10,
      pageToken: pageToken,
      order: 'date',
      type: 'video' // Only fetch videos
    });

    console.log('YouTube API response:', response.data);
    return { data: response.data };
  } catch (error) {
    console.error('Error fetching YouTube data:', error.message);
    throw new HttpsError('internal', `Error fetching YouTube data: ${error.message}`);
  }
});
