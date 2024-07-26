const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { google } = require('googleapis');
const { getUserTokens, refreshAccessToken, storeUserTokens } = require('./utils');


module.exports = onCall(async (data, context) => {
  const idToken = data.data.idToken;
  const playlistTitle = data.data.playlistTitle;
  const videoIds = data.data.videoIds;

  if (!idToken || !playlistTitle || !videoIds || !Array.isArray(videoIds)) {
    throw new HttpsError('invalid-argument', 'ID token, playlist title, and video IDs array are required');
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

    const youtube = google.youtube('v3');

    // 1. 플레이리스트 생성
    const playlistResponse = await youtube.playlists.insert({
      part: 'snippet,status',
      resource: {
        snippet: {
          title: playlistTitle,
          description: 'A new playlist created via Firebase Functions',
        },
        status: {
          privacyStatus: 'private',
        },
      },
      access_token: accessToken,
    });

    const playlistId = playlistResponse.data.id;

    // 비디오 추가
    for (const videoId of videoIds) {
      await retryRequest(() =>
        youtube.playlistItems.insert({
          part: 'snippet',
          requestBody: {
            snippet: {
              playlistId: playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId
              }
            }
          },
          access_token: accessToken,
        })
      );
    }

    return { success: true };
  
    } catch (error) {
      console.error('Error creating YouTube playlist or adding videos:', error);
      throw new HttpsError('internal', 'Error creating YouTube playlist or adding videos');
    }
  });


async function retryRequest(requestFunction, retries = 3, initialDelay = 1000) {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await requestFunction();
    } catch (error) {
      lastError = error;
      if (error.response && error.response.status === 503) {
        console.warn(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // 지수 백오프
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}