var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/spotify', function(req, res, next) {
    res.render('auth');
  });
  
  module.exports = router;