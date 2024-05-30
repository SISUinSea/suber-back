const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const functions = require("firebase-functions");

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
