var express = require('express');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var GitHubApi = require("github");
var jsnx = require('jsnetworkx');
var async = require('async');

var app = express();

// Constants
const MAX_ROOT_DISTANCE = 1; // starts at 0

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
		
		buildGraph(req.user.username,function(graph){
			console.log("--------------------------")
			console.log("Nodes " + graph.numberOfNodes());
		});
	}

	res.render('index', {
	  user: req.user
	});
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
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

function buildGraph(root, callback){

	var graph = new jsnx.DiGraph();
	
	graph.addNode(root);

	var nodes = [
		{
			label: root,
			level: 0
		}
	];

	async.whilst(
		function(){
			return nodes.length > 0;
		},
		function(next){
			var node = nodes.pop();
			console.log(node);

			if(graph.get(node.label).length > 0) next();

			github.users.getFollowingForUser({
				user: node.label
			}, function(err, res) {
				if(err) console.log(err);

				for(var i in res){
					if(!res[i].login) continue;
					graph.addNode(node.label);
					graph.addEdge(node.label, res[i].login);

					if(node.level + 1 < MAX_ROOT_DISTANCE){
						nodes.push({
							label: res[i].login,
							level: node.level + 1
						});
					}

				}

				next();

			});

		},
		function(err){
			callback(graph);
		}
	);

}
