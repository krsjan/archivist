var User = require('../../models/user.js')
  , express = require('express')
  , passport = require('passport')
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
  , googleClient = {clientID: process.env.GOOGLE_ID, clientSecret: process.env.GOOGLE_SECRET, callbackURL: process.env.GOOGLE_CALLBACK}
  , oauth = express.Router();

// OAUTH 2

var googleClient;

if(process.env.NODE_ENV == 'development') {
  googleClient = {
    clientID: process.env.DEV_GOOGLE_ID,
    clientSecret: process.env.DEV_GOOGLE_SECRET,
    callbackURL: process.env.DEV_GOOGLE_CALLBACK
  }
}

passport.use(new GoogleStrategy(googleClient, function(accessToken, refreshToken, profile, done) {
  User.findOrCreate(profile, done);
}));

oauth.route('/auth/google')
  .get(passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/plus.profile.emails.read'] }),
    function(req, res){
    }
  );

oauth.route('/auth/google/callback')
  .get(passport.authenticate('google', { failureRedirect: '/access-error', session: false }),
    function(req, res) {
      User.issueToken(req.user, function(err, data){
        if(err) res.render('error', { title: err.message, msg: 'Try to <a href="/login">login</a> later.' });
        res.render('welcome', { session: data });
      })
    }
  );

oauth.route('/access-error')
  .get(function(req, res){
    res.render('error', { title: "You have no access. Sorry. See you.", msg: 'Try to <a href="/login">login</a> later.' });
  });

oauth.route('/login')
  .get(function(req, res){
    res.render('login');
  });

module.exports = oauth;