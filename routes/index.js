var express = require('express');
var router = express.Router();
var spotify = require('./configs.js');
var db = require('./account.js');

var client_id = spotify.MY_KEY ; // Your client id
var client_secret = spotify.SECRET_KEY; // Your secret

var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var stateKey = 'spotify_auth_state';
var querystring = require('querystring');
var request = require('request'); // "Request" library
var cors = require('cors');
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
  }

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
}



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
}


//uses a list of seed  tracks to generate a  playlist of 30
// var recommended = function (seeds, atok, minbpm, maxbpm, callback) {
//   var options = {
//     url: 'https://api.spotify.com/v1/recommendations?seed_tracks='+ seeds + '&limit=30&min_energy=0.5&min_danceability=0.5&min_tempo=' + minbpm + '&max_tempo='  +  maxbpm,
//     headers: { 'Authorization': 'Bearer ' + atok },
//     json: true
//   };

//   request.get(options, function(error, response, body){
//     if (error)  return console.log(error);

//     console.log(body);
//   });
// }



//
//end helper functions
//

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title : 'Express'});
});



/*testing that authentication */

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


//test of session things
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


//test bootstrap
router.get('/boot' , function(req, res, next){
  res.render("bootstrap");
});

router.post('/boot' , function(req, res, next){
  console.log(req.body.username);
  console.log(req.body.password);
  res.redirect('/')
});


//test dash tempo playlist generation

router.get('/dash' , function(req, res, next){
  if (!req.session.user){
    return res.status(401).send();
  }
  else{
    console.log("username is");
    console.log(req.session.user);
    console.log("access token is");
    console.log(req.session.atok);
    console.log('spotify client id')
    console.log(req.session.spotify);
    return res.render('dashboard')
  }
 
});



router.post('/genplay' , function(req, res, next){
  var pace = req.body.pace;
  var bpm = generateTempo(pace);
  var bpm_min = bpm-5;
  var bpm_max = bpm+10;
  console.log(bpm_max + '<--max '  + bpm_min + '<--min');
  var atok  =  req.session.atok;
  var spotID = req.session.spotify;
  var uname = req.session.user;

  //Create an empty playlist to populate
  // TODO: change this to replace playlist tracks if the db attribute hasPlaylist is true 
  createPlaylist(spotID, atok, uname);


  //find users preferences we are using top 5 tracks.
  var top5 = {
    url: 'https://api.spotify.com/v1/me/top/tracks?limit=5',
    headers: { 'Authorization': 'Bearer ' + atok },
    json: true,
    query: {
      "limit" : "5"
    }
    
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
          url: 'https://api.spotify.com/v1/recommendations?seed_tracks='+ tracks + '&limit=30&min_energy=0.5&min_danceability=0.5&min_tempo=' + bpm_min + '&max_tempo='  +  bpm_max,
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

router.get('/clientid' , function(req, res, next){

var token = req.session.atok;
  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: { 'Authorization': 'Bearer ' + token },
    json: true
  };


  request.get(options, function(error, response, body){
    var id = body.id;
    
    console.log("ahhh");
    req.session.spotify = id;
    console.log(req.session.spotify);
    
    res.redirect("/dash");
  });
});

module.exports = router;
