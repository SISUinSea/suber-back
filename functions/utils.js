const admin = require("firebase-admin");
const { google } = require('googleapis');
const fetch = require('node-fetch');

async function getUserTokens(uid) {
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new Error('User document does not exist');
  }
  return userDoc.data();
}

async function storeUserTokens(uid, accessToken, refreshToken) {
  await admin.firestore().collection('users').doc(uid).set({
    accessToken: accessToken,
    refreshToken: refreshToken,
    tokenExpiry: Date.now() + 3600 * 990,
  }, { merge: true });
}

async function refreshAccessToken(refreshToken) {
  const client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
  client.setCredentials({
    refresh_token: refreshToken
  });

  try {
    const tokens = await client.getAccessToken();
    // console.log('Tokens received:', tokens); // 로그 추가
    if (!tokens.token) {
      throw new Error('Failed to refresh access token');
    }
    return tokens.token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}


async function fetchYouTubeData(accessToken) {
  const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.error.message);
  }

  return responseData;
}

async function fetchSubscribedChannels(accessToken) {
  const response = await fetch('https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.error.message);
  }

  return responseData;
}


module.exports = {
  getUserTokens,
  storeUserTokens,
  refreshAccessToken,
  fetchYouTubeData,
  fetchSubscribedChannels,
};
