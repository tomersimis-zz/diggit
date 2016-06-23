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
const MAX_ROOT_DISTANCE = 3; // starts at 0
const NODE_TTL = 90000; // time to keep node cache (in minutes)
const USERS_PER_REQUEST = 4;
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
			// console.log("---------------------------------------------------------")
			// console.log("---------------------------------------------------------")
			// console.log("Nodes " + graph.numberOfNodes());

			// var nodes = graph.nodes();
			// _.forEach(graph.nodes(), function(label){
			// 	var node = graph.get(label);
			// 	console.log(label);
			// 	console.log(node.pre);
			// 	console.log("------")
			// })

			var lp = Recommendation.localPath(req.user.username, graph);

			var lpResult = Recommendation.prepare(lp, req.user.username, graph);

			res.render('index', {
				count: lpResult.length,
				user: req.user,
				lpResult: lpResult
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
<<<<<<< HEAD

	graph.tryAddNode(root);
=======
	
	graph.addNode(root, {
		avatar: ''
	});
>>>>>>> 190adf0b283d95f0b86fb166204ffe070d1592f4

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
<<<<<<< HEAD

	if(processed[node.label]) {
		console.log("[SKIPPING] " + node.label);
=======
	
	if(graph.exists(node.label) && graph.get(node.label).adj.size > 0) {
		//console.log("[SKIPPING] " + node.label);
>>>>>>> 190adf0b283d95f0b86fb166204ffe070d1592f4
		return next();
	}
  processed[node.label] = true;

	//console.log("[PROCESSING] " + node.label + " - " + node.level);

	client.hgetall(node.label, function(err, reply){
		if(reply){
<<<<<<< HEAD
      console.log("[REPLY]");
			var following = reply.following.split(',');
=======
			var following = reply.following.split(',').filter(function(el) {return el.length != 0});;
>>>>>>> 190adf0b283d95f0b86fb166204ffe070d1592f4
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
			graph.get(node.label).starred = reply.starred.split(',').filter(function(el) {return el.length != 0});
			graph.get(node.label).watched = reply.watched.split(',').filter(function(el) {return el.length != 0});
			graph.get(node.label).languages = reply.languages.split(',').filter(function(el) {return el.length != 0});
			graph.get(node.label).avatar = reply.avatar;
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
<<<<<<< HEAD
				graph.tryAddNode(results.following[i].login);
=======
				graph.addNode(results.following[i].login, {
					avatar: results.following[i].avatar_url
				});
>>>>>>> 190adf0b283d95f0b86fb166204ffe070d1592f4
				graph.addEdge(node.label, results.following[i].login);

				nodes.push({
					label: results.following[i].login,
					level: node.level + 1
				});

			}
		}

		var starred = [];
		var languages = {};
		for(var i in results.starred){
			languages[results.starred[i].language] = true;
			starred.push(results.starred[i].name);
		}

		var watched = [];
		for(var i in results.watched){
			languages[results.watched[i].language] = true;
			watched.push(results.watched[i].name);
		}

		languages = Object.keys(languages);

		starred = starred.filter(function(el){ return el != undefined});
		watched = watched.filter(function(el){ return el != undefined});
		languages = languages.filter(function(el){ return el != undefined})

		graph.get(node.label).starred = starred;
		graph.get(node.label).watched = watched;
		graph.get(node.label).languages = languages; 

		client.hmset(node.label, ["avatar", graph.get(node.label).avatar, "following", following.join(), "starred", starred.join(), "watched", watched.join(), "languages", languages.join()], function (err, res) {
			if(err) return console.log(err);
			client.expire(node.label, NODE_TTL*60, function(err, res){
				if(err) return console.log(err);
				next();
			});
		});
	});
}