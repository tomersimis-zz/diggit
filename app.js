var express = require('express');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var GitHubApi = require("github");

var app = express();

// Views configuration
app.set('view engine', 'html');
app.engine('html', require('hbs').__express); 
app.set('views', __dirname + '/views')

// Static files configuration
app.use(express.static('public'));

// Request configuration
app.use(require('body-parser').urlencoded({ extended: true }));

// Session/Auth configuration
app.use(require('cookie-parser')());
app.use(require('express-session')({ secret: 'a7ff21426831e065916e21', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GitHubStrategy({
		clientID: '6a8a7ff214248ff9d900',
		clientSecret: '50f4e0f43116e2188758eb96831e0659285fd229',
		callbackURL: "http://127.0.0.1:3000/auth/callback"
	},function(accessToken, refreshToken, profile, callback) {
		github.authenticate({
			type: "oauth",
			token: accessToken
		});
		return callback(null, profile);
  	}
));

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

var github = new GitHubApi();

app.get('/', function(req, res) {
	
	if(req.user){
		// use github to execute algorithm
	}

	res.render('index', {
	  user: req.user
	});
});

app.get('/auth/',
  passport.authenticate('github', {
	scope: ['user', 'user:follow']
  }));

app.get('/auth/callback', 
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
	res.redirect('/');
  });

app.listen(3000, function () {
  console.log('Server listening on port 3000.');
});