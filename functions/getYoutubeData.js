const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const { getUserTokens, refreshAccessToken, storeUserTokens, fetchYouTubeData } = require('./utils');

module.exports = functions.https.onCall(async (data, context) => {
  const idToken = data.idToken;

  if (!idToken) {
    throw new functions.https.HttpsError('unauthenticated', 'No ID token provided');
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

    const response = await fetchYouTubeData(accessToken);
    return { data: response };
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    throw new functions.https.HttpsError('internal', 'Error fetching YouTube data', error.message);
  }
});
