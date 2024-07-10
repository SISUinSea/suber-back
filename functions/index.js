const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.verifyusertoken = require('./verifyUserToken');
exports.helloworld = require('./helloWorld');
exports.getSubscribedChannels = require('./getSubscribedChannels');
exports.createYoutubePlaylist = require('./createYoutubePlaylist');
exports.getChannelVideos = require('./getChannelVideos');
