var express = require("express");
var app     = express();
var port    = process.env.PORT || 3000;
var bodyParser =require("body-parser");
var schedule= require("node-schedule");
var getCrimes= require('./lib/getIncidents.js');
var validation = require('./middleware/addressValidator.js');
//  Modules required for Twilio
var config = require('./config');
var twilioNotifications = require('./middleware/twilioNotifications');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

// set up handlerbars view engine
var handlebars = require("express-handlebars").create({
  defaultLayout: "main",
  helpers: {
    static: function(name) {
      return require('./lib/static.js').map(name);
    }
  }
});

app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");
app.use(express.static('public'));

// Get new crime incidents every 24 hrs
schedule.scheduleJob('0 8 * * * *', function(){
  getCrimes.getIncidentData(getCrimes.saveData);
});

// BASIC ROUTES
app.get('/', function(req, res) {
  res.render("home", {
    currentYear: new Date().getFullYear()
  });
});

app.get(['/','/police'], function(req, res) {
  res.render("police", {
      currentYear : new Date().getFullYear(),
      service     : "Police",
      logo        : '<input type="image" id="badge" src="./images/SPD.jpg"/>',
      switchLink  : '<a class="btn btn-primary red" id="service" type="submit" href="./fire">View Fire Data</a>'
  });
});

app.get('/fire', function(req, res) {
  res.render("fire", {
      currentYear : new Date().getFullYear(),
      service     : "Fire",
      logo        : '<input type="image" id="badge" src="./images/SFD.jpg"/>',
      switchLink  : '<a class="btn btn-primary" id="service" type="submit" href="./police">View Police Data</a>'
  });
});

app.get('/hood', function(req, res) {
  res.render("hood", {
      currentYear : new Date().getFullYear()
  })
});

app.post("/address", validation.parseInput, validation.getGeoCode, function(req, res, next) {
  res.render("hood", {
    data : req.trueResult
  })
});

app.use(function(req, res){
  res.type("text/plain");
  res.status(404);
  res.send("404 - Not Found");
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.type("text/plain");
  res.status(500);
  res.send("500 - Server Error");
});

// Text administrator if errors / fatal errors arise - DISABLED FOR TESTING
app.use(twilioNotifications.notifyOnError);
process.on('uncaughtException', function(err) {
  twilioNotifications.notifyOnError(err);
});

app.listen(port);
