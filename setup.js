var _ = require('lodash');
var colors = require('colors');
var config = require('./config.json');
var fs = require('fs');
var open = require('opn');
var prompt = require('prompt');
var strava = require('strava-v3');

_.extend(process.env, config.env);

console.log("Requesting code for new Access Token".bold.yellow);
open(strava.oauth.getRequestAccessURL({scope:"write"}));

console.log("Enter the code returned from strava to generate your new Access Token:");
prompt.get(['code'], function(err, result){
  strava.oauth.getToken(result.code,function(err,payload) {
      if(payload.access_token !== null) {
        config.env.STRAVA_ACCESS_TOKEN = payload.access_token;
        fs.writeFile('config.json', JSON.stringify(config, null, 2), function(err) {
          if(err !== null){
            console.log(err);
            return;
          }
          console.log(
            'Config file updated with new access_token:'.yellow,
            payload.access_token
          );
          process.exit();
        });
      }
  });
});
