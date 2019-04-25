var express = require('express');
var router = express.Router();
var spotify = require('./configs.js');
var db = require('./account.js');
var fitbit = require('./fitbitconfigs');

var client_id = spotify.MY_KEY ; // Your client id
var client_secret = spotify.SECRET_KEY; // Your secret id
var fit_id = fitbit.ID;
var fit_secret = fitbit.SECRET_KEY

var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var stateKey = 'spotify_auth_state';
var querystring = require('querystring');
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var mongoose =  require('mongoose')
//create connection to new or existing database
mongoose.connect('mongodb://localhost:27017/Account', { useNewUrlParser: true });
var dbm =  mongoose.model('Account');

//some helper functions
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


var getUserPass = function(uname, callback) {
  dbm.findOne({username : uname}, function(err, user){
    if (err) {
      callback (err, null);
    }
    else {
      callback (null, user.password);
    }
  });
};

var UsernameExist = function (input, callback) {
  dbm.find({username : input}, function(err, doc){
    if (err) {
      return callback (err, false );
    }
    else{ //if there is a user with that username already
      if (!doc.length){

        return callback (err, false);
      }
      else {
        console.log(doc);
        return callback(err, true);
      }

    }
  });
}

var matchPassword = function(input, dbout) {
  if (input == dbout) {
    return true;
  }
  else {
    return false;
  }
};

var updateDocSpotifyID = function(uname, value){
  dbm.findOne({username : uname}, function(err, doc){
    if (err) return console.error(err);
    doc.spotifyID = value;
    doc.save();
  } );
};

var updatefitbitrefresh = function(uname, value){
  dbm.findOne({username : uname}, function(err, doc){
    if (err) return console.error(err);
    doc.fitbitfresh = value;
    doc.save();
  } );
};

var updatespotifyrefresh = function(uname, value){
  dbm.findOne({username : uname}, function(err, doc){
    if (err) return console.error(err);
    doc.spotifyfresh = value;
    doc.save();
  } );
};

var updatefitbitaccess = function(uname, value){
  dbm.findOne({username : uname}, function(err, doc){
    if (err) return console.error(err);
    doc.fitbitaccess = value;
    doc.save();
  } );
};

var updatefitbitID = function(uname, value){
  dbm.findOne({username : uname}, function(err, doc){
    if (err) return console.error(err);
    doc.fitID = value;
    doc.save();
  } );
};

var generateTempo = function(pace){
  if (pace <= 6){
    return 171;
  }
  else if (pace <= 8) {
    return 166;
  }
  else if (pace <= 9.4){
    return 163;
  }
  else if (pace <= 11){
    return 160;
  }
  else if (pace <= 12){
    return 156;
  }
  else if (pace <= 14){
    return 153;
  }
  else if (pace <= 20){
    return 150;
  }
  else { //  walkers
    return 113;
  }
};

//promise query for getting the spotify ID if needed
var getSpotIDP = function(uname) {
  var promise = dbm.findOne({username : uname}).select("spotifyID -_id").exec();
  return promise;
};

//promise query for getting the playlist ID if needed
var getPlaylistID = function(uname) {
  var promise = dbm.findOne({username : uname}).select("playlistID -_id").exec();
  return promise;
};

//promise query for finding out if there is already a playlist
var getHasPlaylist = function(uname) {
  var promise = dbm.findOne({username : uname}).select("playlistID -_id").exec();
  return promise;
};

//promise query for finding the fitbit access token and fitID
var getfitbitacess = function(uname) {
  var promise = dbm.findOne({username : uname}).select("fitbitaccess fitID -_id").exec();
  return promise;
};

//puts json object into a string format deliminated by ,
function get_seeds (items, tracks, callback){
  for (var key in items){
    if (items.hasOwnProperty(key)) {
       var id = items[key].id;
       console.log(key + " -> " + items[key].id);
       tracks += (id + ",");
      }
    }
    tracks = tracks.substring(0, tracks.length - 1);
    callback(null, tracks);
  };

function get_uris (items, tracks, callback){
  for (var key in items){
    if (items.hasOwnProperty(key)) {
        var id = items[key].uri;
        console.log(key + " -> " + items[key].uri);
        tracks += (id + ",");
       }
     }

  tracks = tracks.substring(0, tracks.length - 1);
  callback(null, tracks);
};



//
//
//Spotify API Call functions
//
//

//creates empty playlist
var createPlaylist = function (userID, atok, uname) {
    var options = {
      url: 'https://api.spotify.com/v1/users/'+ userID+ '/playlists',
      headers: { 'Authorization': 'Bearer ' + atok },
      json: true,
      body:  {

          "name": "Running Beats",
          "public": true

      }
    };
    request.post(options, function(error,  response,  body){
      if (error) return console.error(error);
      //update playlist exist status in db
      console.log(body.id);
      var id =  body.id;
      dbm.findOne({username : uname}, function(err, doc){
        if (err) return console.error(err);
        doc.hasPlaylist = true;
        doc.playlistID = id;
        doc.save();
        console.log("hasPlaylist set to: True and playlist ID saved");
      } );


      return console.log("Created playlist");
    });
};


//adds a list of tracks to playlist
var addToPlay = function (playID, uri,  atok) {
  var options = {
    url: 'https://api.spotify.com/v1/playlists/'+ playID +'/tracks?uris='+ uri,
    headers: { 'Authorization': 'Bearer ' + atok },
    json: true,
  };

  request.post(options, function(error, response, body){
    if (error) return console.log(error);
    else{
      console.log("Success");
      console.log(body);
    }
  });
};


//
//fitbit API helpers
//

//gets mile time from an activity log
var mileTime = function (time, distance){

  //time is  in milliseconds so convert  to minutes
  var min = (time / 60000);
  var pace  =  (min / distance);

  //round the pace off
  pace  =  Math.round(pace);

  return pace;

};

//iterate through the items in the activity log
var getActivities =  function (items, list, callback){
  for (var key in items){
    if (items.hasOwnProperty(key)) {
       var distance = items[key].distance;
       var time = items[key].duration;
       var pace = mileTime(time, distance);
       list.push(pace);

      }

    }

    callback(null, list);
  };

  // average mile times in a list
  function avgMile (list, sum, callback){
    var  len = list.length;
    for (var i = 0; i< len; i++){
        if (list[i] < 40){
        sum += list[i];
      }
    }
    var avg = (sum/len);
    callback(null, avg);

  };

  // make the api call for daily log
  function dailylog (date, fitid, fittok) {
    var options =  {
      url : 'https://api.fitbit.com/1/user/'+ fitid + '/activities/date/' + date + '.json ',
      headers: { 'Authorization': 'Bearer ' + fittok,
      'Accept-Language' : 'en_US'},
      json: true
    };

    request.get(options, function(err, response, body){
      if(err) return console.error(err);
      console.log('worked');
      return body;
    });
  };



//
//end helper functions
//

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login');
});



// Spotify OAuth Trash here:

router.get('/spotify', function (req,res,next){
  if (!req.session.user){
    res.redirect('/login');
  } else{
    res.render('auth')
  }

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
        //save the users access token and refresh to the session for further use.
        req.session.atok = access_token;
        req.session.rtok = refresh_token;




        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          var uname = req.session.user;
          var spotID = body.id;
          // req.session.spotify = spotID;





          //adds the clients Spotify ID to their mongo doc
          updateDocSpotifyID(uname, spotID);

          //saves the refresh token to the database
          updatespotifyrefresh(uname, refresh_token);


          // console.log(body);
        });


        res.redirect('/clientid');

        // we can also pass the token to the browser to make requests from there

        // res.redirect('/user?' +
        //   querystring.stringify({
        //     access_token: access_token,
        //     refresh_token: refresh_token
        //   }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

router.get('/spotifylogin', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public user-top-read';
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


//Spotify OAuth Trash ENDS

//Fitbit oAuth Trash START

//this may be unessecary in the future but for testing purposes renders a page with button to start oAuth
router.get('/fitbit', function(req, res){
    res.render('fitbit');
});

//redirects client to fitbit authorization page
router.post('/fitbit', function(req, res, next){
  var scope = 'activity heartrate';
  res.redirect('https://www.fitbit.com/oauth2/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: fit_id,
      scope: scope,
      redirect_uri: 'http://localhost:8888/fitcallback'
    }));
});

//the callback page for the fitbit auth
router.get('/fitcallback', function(req, res, next){
  var code = req.query.code || null;
  var uname = req.session.user;

  //exchange that code for an access token
  var authOpt = {
    url: 'https://api.fitbit.com/oauth2/token',
      form: {
        code: code,
        redirect_uri: 'http://localhost:8888/fitcallback',
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(fit_id + ':' + fit_secret).toString('base64'))
      },
      json: true
  };

  request.post(authOpt, function(error, response, body){
    if (!error && response.statusCode === 200) {
      //get token back.
      var access_token = body.access_token,
          refresh_token = body.refresh_token,
          user_id = body.user_id

      //save the access token to the session.
      req.session.fittok = access_token;
      req.session.fitid = user_id;
      req.session.save();

      //save fitbit id to database
      updatefitbitID(uname, user_id);

      //save access token to the database
      updatefitbitaccess(uname, refresh_token);

      //save the refresh token to the database
      updatefitbitrefresh(uname, refresh_token);
      res.redirect('/dash');
    };





  });


});

router.get('/fitrefresh', function(req, res, next){
    if (!req.session.user) return res.redirect('/login');
    uname = req.session.user;
    //get the refresh token from the database;
    dbm.findOne({username : uname}, 'fitbitfresh', function(err, doc){
      if (err) return console.error(err);

      // console.log(doc.fitbitfresh);

      var refresh_token = doc.fitbitfresh;
      var option = {
        url: 'https://api.fitbit.com/oauth2/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(fit_id + ':' + fit_secret).toString('base64')) },
        form: {
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        },
        json: true
      };

      //request new refresh token
      request.post(option, function(error,  response, body){
          var access_token = body.access_token;
          var new_refresh = body.refresh_token;
          console.log(body.access_token);
          console.log(body.refresh_token);

          //update the refresh token and access token in database
          updatefitbitrefresh(uname, new_refresh);
          updatefitbitaccess(uname , access_token);
          res.redirect('/fitbitsession');
      });


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

router.post('/signup', function(req, res, next){
  uname = req.body.username;
  emailuser = req.body.email;
  pass =  req.body.password;
  console.log(uname);

  //check if database is empty
  dbm.count(function (err, count){
    if (count == 0){

      var user =  new dbm ({
        username :  uname,
        password : pass,
        email : emailuser,
        hasPlaylist  : false
     });
      user.save(function (err, dbm){
       if (err) return console.error(err);
       console.log(user);
       console.log("user added");
      });
      req.session.user = uname;
      res.redirect('/spotify')
    }
    else {
      //check to see that username has not already been used

        UsernameExist(uname, function(err, bool){
        //insert user into database if no one already has that username
          if (!bool) {
            var user =  new dbm ({
            username :  uname,
            password : pass,
            email : emailuser,
          });
            user.save(function (err, dbm){
               if (err) return console.error(err);
                 console.log(user);
                  console.log("user added");
               });
          req.session.user = uname;
          res.redirect('/spotify')
      }
           else { //already has a user of that username
              console.log('Username already in use');
              res.render("signupform", {error : "That username is already in use. Please try another one."})
              }


        });

    }

  });

});

router.get('/login', function(req, res, next) {
  res.render('login');
});

router.post('/login', function(req, res, next){
  uname = req.body.username;
  password =  req.body.password;
  console.log(uname);

  dbuser = getUserPass(uname, function(err, dbpass){
    if (err) {
      return console.error(err);
    }
    else {
      console.log(dbpass);

      if (matchPassword(password, dbpass)) {
        console.log ("logged in");
        req.session.user =  uname;

        //get SpotifyID to save in session
        // var promise = getSpotIDP(uname);

        // promise.then(function(id){
        //   var spotID = id.spotifyID;
        //   req.session.spotify = spotID;
        //   req.session.save();
        // });



        res.redirect('/spotifylogin');
      }
      else {
        console.log ("incorrect login");
        res.render('login', {error : "Password and Username do not match"})
      }

    }
  });


});


//test of session things. CAN BE DELETED!
router.get('/sesh', function(req, res, next) {
  if (!req.session.user){
    return res.status(401).send();
  }
  else{
    name = req.session.user;

    console.log(name);
    console.log("access token is");
    console.log(req.session.atok);
    console.log('spotify client id')
    console.log(req.session.spotify);
    res.render('index', {title : name});
  }

});


//test bootstrap unessecary now.  CAN BE DELETED
router.get('/boot' , function(req, res, next){
  res.render("bootstrap");
});

router.post('/boot' , function(req, res, next){
  console.log(req.body.username);
  console.log(req.body.password);
  res.redirect('/')
});


// dash tempo playlist generation

router.get('/dash' , function(req, res, next){
  if (!req.session.user){
    console.log("not logged in.")
    return res.redirect('/login');
  }
  else{ // checks all  session data is stored properly
    console.log("username is --> "+ req.session.user );
    console.log("spotify access token is --> " +req.session.atok);
    console.log('spotify client id --> ' + req.session.spotify);
    console.log('fitbit access token is --> ' + req.session.fittok);
    console.log('fitbit client id is --> ' + req.session.fitid);
    return res.render('dashboard')
  }

});


//Generates a playlist based on
router.post('/genplay' , function(req, res, next){
  var pace = req.body.pace;
  var bpm = generateTempo(pace);
  var bpm_min = bpm;
  var bpm_max = bpm+15;
  console.log(bpm_max + '<--max '  + bpm_min + '<--min');
  var atok  =  req.session.atok;
  var spotID = req.session.spotify;
  var uname = req.session.user;

  //Create an empty playlist to populate
  // TODO: change this to replace playlist tracks if the db attribute hasPlaylist is true
  createPlaylist(spotID, atok, uname);


  //find users preferences we are using top 5 tracks.
  var top5 = {
    url: 'https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term',
    headers: { 'Authorization': 'Bearer ' + atok },
    json: true
  };

  //need just get a list of top5 trackID's
  request.get(top5, function(error,  response,  body) {
    if (error) return console.log(error);
      console.log(body);
      var seed_tracks = "";
      var items = body.items;
      //gets the seed tracks ids in list
      var track = get_seeds(items, seed_tracks, function (err, tracks){
        // console.log(tracks);
        //generates the recommendations and puts the

        var recommend = {
          url: 'https://api.spotify.com/v1/recommendations?seed_tracks='+ tracks + '&limit=30&target_energy=0.7&min_danceability=0.5&min_tempo=' + bpm_min + '&max_tempo='  +  bpm_max,
          headers: { 'Authorization': 'Bearer ' + atok },
          json: true
        };

        request.get(recommend, function(error, response, body){
          if (error)  return console.log(error);
          var item = body.tracks;
          //getting that list of recommended tracks
          var addtracks = '';
          var addTo =  get_uris(item,  addtracks, function (err, fTracks){

            //first get the playlist ID back from mongo.
            var promise = getPlaylistID(uname);

            promise.then(function(id){
              var playID = id.playlistID;
              // console.log(playID);

              //now populate the playlist
              addToPlay(playID, fTracks, atok);

              //use spotify playlist ID to get link
              var playlist = {
                url: 'https://api.spotify.com/v1/playlists/'+playID,
                headers: { 'Authorization': 'Bearer ' + atok },
                json: true,
              };
              request.get(playlist, function(error, response, body){
                if (error) return console.log(error);
                url = body.external_urls;
                console.log(url);
                //TODO: display spotify playlist somehow? or send url.
                res.redirect('/dash');
              });

            });


          });
        });


      });

  });


});

//Getting the spotify ID through the spotify api and saving to the session. After spotify oAuth the client
//will be redirected here then redirected to fitbit session routes then to dash.
router.get('/clientid' , function(req, res, next){

var token = req.session.atok;
  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };


  request.get(options, function(error, response, body){
    var id = body.id;

    req.session.spotify = id;

    //direct user to get fitbit session refresh. Will not do anything if user has not linked up their account yet. Will then redirect eventually to dashboard.
    // res.redirect("/fitrefresh");
    res.redirect('/fitrefresh');
  });
});

//Getting fitbit access through database and saving to session.

router.get('/fitbitsession', function(req, res, next){
  var uname  = req.session.user;
  //get the data from database
  var promise = getfitbitacess(uname);
    promise.then(function(id){
    var access_token = id.fitbitaccess;
    var fitID = id.fitID;
    req.session.fittok = access_token;
    req.session.fitid = fitID;
    req.session.save();
    return res.redirect('/dash');
  })



});


//another redirect to save the seesion?
// router.get('/waste', function (req, res,  next){
//     console.log(req.session.fittok);
//     console.log(req.session.fitid);
//     return res.redirect('/dash');
// });



//generate playlist with fitbit data
router.post('/genpaceplay', function (req, res,  next){

  if (!req.session.fittok){  //See if the client has a linked fitbit account if not  redirect to try and link
    console.log("No fitbit account. Redirect to fitbit OAuth");
    return res.redirect('/fitbit');
  }
  else{
    //get all variables needed to do the api call
    var fittok =  req.session.fittok;
    var fitid = req.session.fitid;
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

    var options =  {
      url : 'https://api.fitbit.com/1/user/'+ fitid + '/activities/date/' + date + '.json ',
      headers: { 'Authorization': 'Bearer ' + fittok,
      'Accept-Language' : 'en_US'},
      json: true
    };

    request.get(options, function(err, res, body){
      if (err) return console.error(err);
      var list = [];
      var act =  body.activities;

      //go through each activity logged for the day and pull the time and distance
      var test = getActivities(act, list, function(err, final){
        console.log(final);
        var sum = 0;
        var avg = avgMile(final, sum, (function (err, val){
          console.log(val);
          if (isNaN(val)){ //no run data for today
            console.log('no current run data');
          }
          else{ // generate playlist using the same code as using the input
                var pace = val;
                var bpm = generateTempo(pace);
                var bpm_min = bpm;
                var bpm_max = bpm+15;
                console.log(bpm_max + '<--max '  + bpm_min + '<--min');
                var atok  =  req.session.atok;
                var spotID = req.session.spotify;
                var uname = req.session.user;

                //Create an empty playlist to populate
                // TODO: change this to replace playlist tracks if the db attribute hasPlaylist is true
                createPlaylist(spotID, atok, uname);

                //find users preferences we are using top 5 tracks.
                var top5 = {
                  url: 'https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term',
                  headers: { 'Authorization': 'Bearer ' + atok },
                  json: true

                };

                //need just get a list of top5 trackID's
                request.get(top5, function(error,  response,  body) {
                  if (error) return console.log(error);
                    console.log(body);
                    var seed_tracks = "";
                    var items = body.items;
                    //gets the seed tracks ids in list
                    var track = get_seeds(items, seed_tracks, function (err, tracks){
                      // console.log(tracks);
                      //generates the recommendations and puts the

                      var recommend = {
                        url: 'https://api.spotify.com/v1/recommendations?seed_tracks='+ tracks + '&limit=30&target_energy=0.7&min_danceability=0.5&min_tempo=' + bpm_min + '&max_tempo='  +  bpm_max,
                        headers: { 'Authorization': 'Bearer ' + atok },
                        json: true
                      };

                      request.get(recommend, function(error, response, body){
                        if (error)  return console.log(error);
                        var item = body.tracks;
                        //getting that list of recommended tracks
                        var addtracks = '';
                        var addTo =  get_uris(item,  addtracks, function (err, fTracks){

                          //first get the playlist ID back from mongo.
                          var promise = getPlaylistID(uname);

                          promise.then(function(id){
                            var playID = id.playlistID;
                            // console.log(playID);

                            //now populate the playlist
                            addToPlay(playID, fTracks, atok);

                            //use spotify playlist ID to get link
                            var playlist = {
                              url: 'https://api.spotify.com/v1/playlists/'+playID,
                              headers: { 'Authorization': 'Bearer ' + atok },
                              json: true,
                            };

                            request.get(playlist, function(error, response, body){
                              if (error) return console.log(error);
                              url = body.external_urls;
                              console.log(url);
                              //TODO: display spotify playlist somehow? or send url.

                            });

                          });


                        });
                      });


                    });

                });

          }  // end of the else for generating playlist
        }));


      });


    });

  }  //end of first else
  res.redirect('/dash');

});
router.get("/logout", function(req, res) {
  req.session.user = null;
  req.logout();
  res.redirect("/login");
});

//test functions page
router.get('/testfunc' , function(req, res,  next){

    var dist =  2.2;
    var time = 1200000;


    console.log( mileTime(time, dist));

    return res.render('index');
});

//for funsies.
router.get('/strugs2func',  function(req, res, next){

  var ughhhh = "Kelly Chiang is:"

  res.render('easteregg', {text : ughhhh});

})

module.exports = router;
