const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require('googleapis');
const { getUserTokens, refreshAccessToken, storeUserTokens } = require('./utils');

module.exports = functions.https.onCall(async (data, context) => {
  const idToken = data.idToken;
  const playlistTitle = data.playlistTitle;
  const videoIds = data.videoIds; // 새로 추가: 플레이리스트에 추가할 비디오 ID 배열

  if (!idToken || !playlistTitle || !videoIds || !Array.isArray(videoIds)) {
    throw new functions.https.HttpsError('invalid-argument', 'ID token, playlist title, and video IDs array are required');
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

    // 2. 비디오 추가
    const addVideoPromises = videoIds.map(videoId => 
      youtube.playlistItems.insert({
        part: 'snippet',
        resource: {
          snippet: {
            playlistId: playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId: videoId,
            },
          },
        },
        access_token: accessToken,
      })
    );

    await Promise.all(addVideoPromises);

    return { data: playlistResponse.data, message: 'Playlist created and videos added successfully' };
  } catch (error) {
    console.error('Error creating YouTube playlist or adding videos:', error);
    throw new functions.https.HttpsError('internal', 'Error creating YouTube playlist or adding videos', error.message);
  }
});