var express = require('express');
var router = express.Router();

var client_id = configspotify.MY_KEY ; // Your client id
var client_secret = configspotify.SECRET_KEY; // Your secret

var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var stateKey = 'spotify_auth_state';
var querystring = require('querystring');
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

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
  res.render('index', {title : 'Express'});
});



/*testing that authentication */

router.get('/spotify', function (req,res,next){
  res.render('auth')
});

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
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/user?' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
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
  var scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
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


/*playing with getting a users playlist once authenticated  */
router.get('/playlist', function(req, res, next) {
  var access_token =  req.query.token;
  var queer = req.query.pstype;
  console.log(queer);
  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };
  
  request.get(options, function(error, response, body) {
    var userID = body.id;
    // var email = body.email;
    // console.log(userID);
    var playlist = {
      url: "https://api.spotify.com/v1/me/playlists",
      headers: { 'Authorization' : 'Bearer ' + access_token},
      json: true
    };
    
    request.get (playlist, function(error, response, body) {
      console.log(body);
      var context = body;
      if (queer == "Public") {
        res.render ('getplaylist', {c : context, uid : userID, pub : queer });
      }
      else if (queer == "All"){
        res.render ('getplaylist', {c : context, uid : userID, all : queer });
      }
      else {
        res.render ('getplaylist', {c : context, uid : userID, sec : queer });
      }
      
    });
  });
  // console.log(access_token);
  // res.render('getplaylist', {at : access_token});
});

router.get('/user', function(req,res){
  var token = req.query.access_token;
  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };

  request.get(options, function(error, response, body){
    var dpname = body.display_name;
    var country = body.country;
    var email = body.email;
    var prof = body.images
    console.log(prof)
    //var prof  =  body.images;
    var id = body.id;
    console.log(dpname);
    console.log(email);
    res.render('user', {display_name : dpname, id : id, email : email, country : country, image : prof, tok :  token});

  });

});

router.get('/signup', function(req, res, next) {
  res.render('signupform');


});


module.exports = router;
