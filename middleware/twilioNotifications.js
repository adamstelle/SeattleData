var twilioClient = require('../twilioClient');
var admins = require('../jsonData/administrators.json');

function formatMessage(errorToReport) {
  return 'SeattleServices site error! It appears the server is having issues. Exception: ' + errorToReport + '.';
};

exports.notifyOnError = function(appError, request, response, next) {
  console.log("Seeing an error! Text should be sending!");
  admins.forEach(function(admin) {
    var messageToSend = formatMessage(appError.message);
    twilioClient.sendSms(admin.phoneNumber, messageToSend);
  });
  setTimeout(() => {
    console.log("Shutting down app");
    appError;
  }, 1000);
};
