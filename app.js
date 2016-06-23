var express = require('express');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var GitHubApi = require("github");
var async = require('async');
var redis = require("redis");
var _ = require('lodash');

var Graph = require('./graph.js');
var Recommendation = require('./recommendation.js');

// Express
var app = express();

// Constants
const MAX_ROOT_DISTANCE = 4; // starts at 0
const NODE_TTL = 120; // time to keep node cache (in minutes)
const USERS_PER_REQUEST = 2;
const STARRED_PER_REQUEST = 1000;
const WATCHED_PER_REQUEST = 1000;

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

// Redis
client = redis.createClient();

client.on("error", function (err) {
    console.log("[REDIS ERROR] " + err);
});

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
		
		buildGraph(req.user.username, function(graph){
			console.log("---------------------------------")
			console.log("Nodes " + graph.numberOfNodes());

			res.render('index', {
				user: req.user
			});

		});
	}else{
		res.render('index');
	}

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

var server = app.listen(3000, function () {
  console.log('Server listening on port 3000.');
});

server.timeout = 10*60*1000;

var processed;

function buildGraph(root, callback){
  processed = {}

	var graph = new Graph();

	graph.tryAddNode(root);

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
			fetchNode(nodes, graph, next);
		},
		function(err){
			callback(graph);
		}
	);

}

function fetchNode(nodes, graph, next){
	var node = nodes.shift();

	if(processed[node.label]) {
		console.log("[SKIPPING] " + node.label);
		return next();
	}
  processed[node.label] = true;

	console.log("[PROCESSING] " + node.label + " - " + node.level);

	client.hgetall(node.label, function(err, reply){
		if(reply){
      console.log("[REPLY]");
			var following = reply.following.split(',');
			if(node.level < MAX_ROOT_DISTANCE){
				for(var i in following){
					if(!following[i] || following[i].length == 0) continue;
					graph.tryAddNode(following[i]);
					graph.addEdge(node.label, following[i]);

					nodes.push({
						label: following[i],
						level: node.level + 1
					});
				}
			}
			graph.get(node.label).starred = reply.starred.split(',');
			graph.get(node.label).watched = reply.watched.split(',');
			next();
		}else{
      console.log("[BUILD]");
			buildNode(node, nodes, graph, next);
		}
	});

}

function buildNode(node, nodes, graph, next){

	async.parallel({
		following: function(callback){
			if(node.level >= MAX_ROOT_DISTANCE) return callback(null, []);

			github.users.getFollowingForUser({
				user: node.label,
				per_page: USERS_PER_REQUEST
			}, function(err, res) {
				if(err) console.log(err);
				callback(null, res)
			});
		},
		starred: function(callback){
			github.activity.getStarredReposForUser({
				user: node.label,
				per_page: STARRED_PER_REQUEST
			}, function(err, res){
				if(err) console.log(err);
				callback(null, res);
			});
		},
		watched: function(callback){
			github.activity.getStarredReposForUser({
				user: node.label,
				per_page: WATCHED_PER_REQUEST
			}, function(err, res){
				if(err) console.log(err);
				callback(null, res);
			});
		}
	},
	function(err, results) {
		var following = [];
		if(node.level < MAX_ROOT_DISTANCE){
			for(var i in results.following){
				if(!results.following[i].login || results.following[i].login.length == 0) continue;

				following.push(results.following[i].login);
				graph.tryAddNode(results.following[i].login);
				graph.addEdge(node.label, results.following[i].login);

				nodes.push({
					label: results.following[i].login,
					level: node.level + 1
				});

			}
		}

		var starred = [];
		for(var i in results.starred){
			starred.push(results.starred[i].full_name);
		}

		var watched = [];
		for(var i in results.watched){
			watched.push(results.watched[i].full_name);
		}

		graph.get(node.label).starred = starred;
		graph.get(node.label).watched = watched;

		client.hmset(node.label, ["following", following.toString(), "starred", starred.toString(), "watched", watched.toString()], function (err, res) {
			if(err) return console.log(err);
			client.expire(node.label, NODE_TTL*60, function(err, res){
				if(err) return console.log(err);
				next();
			});
		});
	});
}