var express = require('express');
var router = express.Router();

var client_id = 'df441e97cb38440c879d2080015b1b12' ; // Your client id
var client_secret = 'b8045db09c544880b37ae2c7f0844a3c'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var stateKey = 'spotify_auth_state';
var querystring = require('querystring');
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var EventEmitter = require("events").EventEmitter;
var usertemp = new EventEmitter();




var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('auth');
});



/*testing that authentication */

// router.get('/spotify', function (req,res,next){
//   res.render('auth')
// });

router.get('/callback', function(req, res, next) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error,response, body) {
          usertemp.data =body;
          usertemp.emit('update');
        });

        usertemp.on('update', function (){
          console.log(usertemp.data);
        });
        console.log(usertemp.data);


        // console.log(access_token);
        // res.render('auth', {layout: 'user-profile-template'});
        // we can also pass the token to the browser to make requests from there
        res.redirect('/user?' +  querystring.stringify({
          access_token: access_token,
          refresh_token: refresh_token
          }));


      }
      else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

router.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});


  // your application requests refresh and access tokens
  // after checking the state parameter




router.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});


module.exports = router;
