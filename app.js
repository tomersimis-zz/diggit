var express = require('express');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var GitHubApi = require("github");
var async = require('async');
var redis = require("redis");
var _ = require('lodash');

var Graph = require('./graph.js');
var Recommendation = require('./recommendation.js');
var Triadic = require('./triadic.js');
var Helpers = require('./helpers.js');

// Express
var app = express();

/*
MAX_ROOT_DISTANCE = 3; // starts at 0
USERS_PER_REQUEST = 4;
FOLLOWERS_USERS_PER_REQUEST = 0;
*/
// Constants
const MAX_ROOT_DISTANCE = 3; // starts at 0
const NODE_TTL = 90000; // time to keep node cache (in minutes)
const USERS_PER_REQUEST = 20;
const LP_USERS_PER_REQUEST = 4;
const FOLLOWERS_USERS_PER_REQUEST = 1000;
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


var LOCAL_PATH_METRIC = "localpath";
var TRIADIC_METRIC = "triadic";
var CURRENT_METRIC = "";

function useLocalPathMetric(){
    CURRENT_METRIC = LOCAL_PATH_METRIC;
}

function useTriadicMetric(){
    CURRENT_METRIC = TRIADIC_METRIC;
}


app.get('/', function(req, res) {

	if(req.user){
        if(req.query.metric != LOCAL_PATH_METRIC && req.query.metric != TRIADIC_METRIC){
            res.render('index', {
            	user: req.user
            });
        }
        else {
    		buildGraph(req.user.username, function(graph){
                var results;

                if(req.query.metric == TRIADIC_METRIC){
                    Triadic.build(graph);
                    results = Triadic.getRecommendations(req.user.username);
                }
                else if(req.query.metric == LOCAL_PATH_METRIC){
                    var lp = Recommendation.localPath(req.user.username, graph);
        			results = Recommendation.prepare(lp, req.user.username, graph);
                }

				var newUser = false;

				if(results <= 5){
					newUser = true;
					results.push({
						index: 1,
						login: 'GrahamCampbell',
						avatar: 'https://avatars1.githubusercontent.com/u/2829600?v=3',
						pre: [],
						score: '1',
						commonStarred: [],
						commonWatched: [],
						commonLanguages: [],
						auto: false
					});
					results.push({
						index: 1,
						login: 'josh',
						avatar: 'https://avatars2.githubusercontent.com/u/137?v=3',
						pre: [],
						score: '2',
						commonStarred: [],
						commonWatched: [],
						commonLanguages: [],
						auto: false
					});
					results.push({
						index: 1,
						login: 'rkh',
						avatar: 'https://avatars2.githubusercontent.com/u/30442?v=3',
						pre: [],
						score: '3',
						commonStarred: [],
						commonWatched: [],
						commonLanguages: [],
						auto: false
					});
					results.push({
						index: 1,
						login: 'SamyPesse',
						avatar: 'https://avatars2.githubusercontent.com/u/845425?v=3',
						pre: [],
						score: '4',
						commonStarred: [],
						commonWatched: [],
						commonLanguages: [],
						auto: false
					});
					results.push({
						index: 1,
						login: 'fabpot',
						avatar: 'https://avatars0.githubusercontent.com/u/47313?v=3',
						pre: [],
						score: '5',
						commonStarred: [],
						commonWatched: [],
						commonLanguages: [],
						auto: false
					});
					results.push({
						index: 1,
						login: 'tmm1',
						avatar: 'https://avatars0.githubusercontent.com/u/2567?v=3',
						pre: [],
						score: '6',
						commonStarred: [],
						commonWatched: [],
						commonLanguages: [],
						auto: false
					});
				}

                if(req.xhr) {
                	/*res.json({
	    				count: results.length,
	    				user: req.user,
	    				lpResult: results
	    			});*/
    		 		res.render('container', {
	    				count: results.length,
	    				user: req.user,
	    				lpResult: results,
						newUser: newUser
	    			});
                }
                else {
	                res.render('index', {
	    				count: results.length,
	    				user: req.user,
	    				lpResult: results,
						newUser: newUser
	    			});
            	}
    		});
        }
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

function buildGraph(root, callback){

	var graph = new Graph();

	graph.tryAddNode(root, {
		avatar: '',
        level: 0,
        transitive_count: 0
	});

	var nodes = [
		{
			label: root,
			level: 0
		}
	];

	var processed = {};

	async.whilst(
		function(){
			return nodes.length > 0;
		},
		function(next){
			fetchNode(nodes, graph, processed, root, next);
		},
		function(err){
			callback(graph);
		}
	);

}

function fetchNode(nodes, graph, processed, root_node, next){
	var node = nodes.shift();

	if(processed[node.label]) {
		console.log("[SKIPPING] " + node.label);
		return next();
	}
	processed[node.label] = true;

    console.log("[PROCESSING] " + node.label + " - " + node.level);

	client.hgetall(node.label, function(err, reply){
		if(reply){ // Node is in cache, load the data
			var following = Helpers.clean(reply.following.split(','));
			if(node.level < MAX_ROOT_DISTANCE){
				for(var i=0; i < following.length; i++){
					if(!following[i] || following[i].length == 0) continue;
                    graph.tryAddNode(following[i], {
                        level: node.level+1
    				});
					graph.addEdge(node.label, following[i]);
                    if(node.label != root_node && graph.get(root_node).adj.indexOf(node.label) >= 0){
                        graph.get(following[i]).transitive_count++;
                    }
					nodes.push({
						label: following[i],
						level: node.level + 1
					});
				}
			}
			graph.get(node.label).starred = Helpers.clean(reply.starred.split(','));
			graph.get(node.label).watched = Helpers.clean(reply.watched.split(','));
			graph.get(node.label).languages = Helpers.clean(reply.languages.split(','));
			graph.get(node.label).avatar = reply.avatar;
            graph.get(node.label).followers_count = reply.followers_count;

			next();
		}else{ // Node is NOT in the cache, we have to build the node
			buildNode(node, nodes, graph, root_node, next);
		}
	});

}

function buildNode(node, nodes, graph, root_node, next){

	async.parallel({
        followers: function(callback){
			if(node.level >= MAX_ROOT_DISTANCE) return callback(null, []);

			github.users.getFollowersForUser({
				user: node.label,
				per_page: FOLLOWERS_USERS_PER_REQUEST
			}, function(err, res) {
				if(err) console.log(err);
				callback(null, res)
			});
		},
		following: function(callback){
			if(node.level >= MAX_ROOT_DISTANCE) return callback(null, []);

			github.users.getFollowingForUser({
				user: node.label,
				per_page: (node.level == MAX_ROOT_DISTANCE-1) ? LP_USERS_PER_REQUEST : USERS_PER_REQUEST
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
			github.activity.getWatchedReposForUser({
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
			for(var i = 0; i < results.following.length; i++){
				if(!results.following[i].login || results.following[i].login.length == 0) continue;
				following.push(results.following[i].login);

				graph.tryAddNode(results.following[i].login, {
					avatar: results.following[i].avatar_url,
                    level: node.level+1,
				});

                if(node.label != root_node && graph.get(root_node).adj.indexOf(node.label) >= 0){
                    graph.get(results.following[i].login).transitive_count++;
                }

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

		starred = Helpers.clean(starred);
		watched = Helpers.clean(watched);
		languages = Helpers.clean(languages);
		graph.get(node.label).starred = starred;
		graph.get(node.label).watched = watched;
		graph.get(node.label).languages = languages;
        graph.get(node.label).followers_count = results.followers.length;

		if(!graph.get(node.label).avatar) graph.get(node.label).avatar = 'https://i2.wp.com/assets-cdn.github.com/images/gravatars/gravatar-user-420.png?ssl=1';

		// Save node in the cache
		client.hmset(node.label, ["avatar", graph.get(node.label).avatar, "following", following.join(), "starred", starred.join(), "watched", watched.join(), "languages", languages.join(), "followers_count", graph.get(node.label).followers_count], function (err, res) {
			if(err) return console.log(err);
			client.expire(node.label, NODE_TTL*60, function(err, res){
				if(err) return console.log(err);
				next();
			});
		});
	});
}
