const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const fetch = require('node-fetch');
const { google } = require('googleapis');



// Firebase Admin SDK를 초기화합니다.
admin.initializeApp();

// Callable function으로 ID 토큰을 검증하고 UID를 반환합니다.
exports["verifyusertoken"] = onCall({cors: true}, async (data, context) => {

  // context 전체를 로깅하여 확인
  logger.info("Received context:", context);

  // 인증된 사용자가 있는지 확인합니다.
  if (!context || !context.auth) {
    // 인증되지 않은 요청은 처리하지 않습니다.
    logger.error("No authentication found for incoming request");
    throw new functions.https.HttpsError("unauthenticated", context);
  }

  try {
    const uid = context.auth.uid;
    return {uid: uid};
  } catch (error) {
    // 검증 과정에서 에러가 발생하면, 에러 메시지를 보냅니다.
    logger.error("Error verifying user token:", error);
    throw new functions.https.HttpsError("internal", "Not viable token", error.message);
  }
});

// 기본 예제 함수
exports.helloworld = onCall({cors: true}, (request) => {
  logger.info("Hello logs!", {structuredData: true});
  return {
    message: "Hello World from LOCAL Firebase Functions!",
  };
});


exports.getYouTubeData = functions.https.onCall(async (data, context) => {
  const idToken = data.idToken;

  if (!idToken) {
    throw new functions.https.HttpsError('unauthenticated', 'No ID token provided');
  }

  try {
    // ID 토큰을 검증하고 사용자 정보 가져오기
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // decodedToken이 제대로 된 토큰이 아닐 때의 예외처리를 해야 함!

    // Firestore에서 accessToken과 refreshToken 가져오기
    const userData = await getUserTokens(uid);
    let accessToken = userData.accessToken;

    // Access Token이 만료되었는지 확인
    if (Date.now() > userData.tokenExpiry) {
      accessToken = await refreshAccessToken(userData.refreshToken);
      // 새로 발급받은 accessToken을 Firestore에 저장
      await storeUserTokens(uid, accessToken, userData.refreshToken);
    }

    // YouTube Data API 호출
    const response = await fetchYouTubeData(accessToken);

    return { data: response };
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    throw new functions.https.HttpsError('internal', 'Error fetching YouTube data', error.message);
  }
});

// Firestore에서 accessToken과 refreshToken 가져오기
async function getUserTokens(uid) {
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new Error('User document does not exist');
  }
  return userDoc.data();
}

// 새로 발급받은 accessToken을 Firestore에 저장
async function storeUserTokens(uid, accessToken, refreshToken) {
  await admin.firestore().collection('users').doc(uid).set({
    accessToken: accessToken,
    refreshToken: refreshToken,
    tokenExpiry: Date.now() + 3600 * 1000 // 토큰 만료 시간 갱신
  }, { merge: true });
}

// refreshToken을 사용하여 accessToken 갱신
async function refreshAccessToken(refreshToken) {
  const client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
  client.setCredentials({
    refresh_token: refreshToken
  });

  const tokens = await client.getAccessToken();
  if (!tokens.token) {
    throw new Error('Failed to refresh access token');
  }
  return tokens.token;
}

// YouTube Data API 호출
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

exports.getSubscribedChannels = functions.https.onCall(async (data, context) => {
  const idToken = data.idToken;

  if (!idToken) {
    console.error('No ID token provided');
    throw new functions.https.HttpsError('unauthenticated', 'No ID token provided');
  }

  try {
    // ID 토큰을 검증하고 사용자 정보 가져오기
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('Decoded token:', decodedToken);
    const uid = decodedToken.uid;

    // Firestore에서 accessToken과 refreshToken 가져오기
    const userData = await getUserTokens(uid);
    console.log('User data:', userData);
    let accessToken = userData.accessToken;

    // Access Token이 만료되었는지 확인
    if (Date.now() > userData.tokenExpiry) {
      console.log('Access token expired, refreshing...');
      accessToken = await refreshAccessToken(userData.refreshToken);
      // 새로 발급받은 accessToken을 Firestore에 저장
      await storeUserTokens(uid, accessToken, userData.refreshToken);
    }

    // YouTube Data API 호출
    const response = await fetchSubscribedChannels(accessToken);
    console.log('YouTube Data API response:', response);

    return { data: response };
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    throw new functions.https.HttpsError('internal', 'Error fetching YouTube data', error.message);
  }
});

// 유저가 구독한 채널 목록 가져오기
async function fetchSubscribedChannels(accessToken) {
  try {
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
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    throw error;
  }
}