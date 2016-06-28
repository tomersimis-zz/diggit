var _ = require('lodash');
var Graph = require('./graph.js');
var Helpers = require('./helpers.js');

var Recommendation = {};

Recommendation.getWeight = function(starred1, watched1, languages1, starred2, watched2, languages2){
	var starred = _.intersection(starred1, starred2).length/_.union(starred1, starred2).length;
	var watched = _.intersection(watched1, watched2).length/_.union(watched1, watched2).length;
    var languages = _.intersection(languages1, languages2).length/_.union(languages1, languages2).length;
	return starred*watched*languages;
}

Recommendation.mapScore = function(score, max){
    return 5.0*score/max;
}

Recommendation.localPath = function(root, graph){
	var l2 = {};
	var q2 = {};
	var l3 = {};

	var rootNode = graph.get(root);

	// A --> B --> Root
	var nodes = graph.nodes();
	for(var i in nodes){
		var a = graph.get(nodes[i]);
        if(a.label == root) continue;
		l2[a.label] = 0;
		q2[a.label] = 0;
		var predecessors = a.pre;
		for(var j in predecessors){
			var b = graph.get(predecessors[j]);
			if(b.pre.indexOf(root) >= 0){
				l2[a.label] += Recommendation.getWeight(a.starred, a.watched, a.languages, b.starred, b.watched, b.languages);
				l2[a.label] += Recommendation.getWeight(b.starred, b.watched, b.languages, rootNode.starred, rootNode.watched, rootNode.languages);
				q2[a.label]++;
			}
		}
	}

	for(var i in nodes){
		var a = graph.get(nodes[i]);
		l3[nodes[i]] = 0;
		var predecessors = a.pre;
		for(var j in predecessors){
			var b = graph.get(predecessors[j]);
			l3[nodes[i]] += l2[predecessors[j]] + q2[predecessors[j]]*Recommendation.getWeight(b.starred, b.watched, b.languages, rootNode.starred, rootNode.watched, rootNode.languages);
		}
	}
    var res = {};
    for(var i in l2) res[i] = l2[i] + 0.7*l3[i];

    return res;
}

Recommendation.prepare = function(dict, root, graph){
    var items = Object.keys(dict).map(function(key) {
        return [key, dict[key]];
    });

    items = items.filter(function(item){
        return graph.get(root).adj.indexOf(item[0]) < 0;
    })

    items.sort(function(first, second) {
        return second[1] - first[1];
    });

    return items.map(function(item){
    	var pre = graph.path(item[0], root);
        path.shift();
        return {
            login: item[0],
            avatar: graph.get(item[0]).avatar,
            pre: pre.map(function(p){ return { pavatar: graph.get(p).avatar } }),
            score: Recommendation.mapScore(item[1], items[0][1]).toFixed(2),
            commonStarred: Helpers.formatList(_.intersection(graph.get(item[0]).starred, graph.get(root).starred)),
            commonWatched: Helpers.formatList(_.intersection(graph.get(item[0]).watched, graph.get(root).watched)),
            commonLanguages: Helpers.formatList(_.intersection(graph.get(item[0]).languages, graph.get(root).languages)),
			followers_count: graph.get(item[0]).followers_count
        }
    }).filter(function(el){
		return el.score > 0;
	});
}

module.exports = Recommendation;

//Test
// var g = new Graph();
// g.addNode("tomer", {starred: ['a', 'b', 'c'], watched: ['a', 'b', 'c']});
// g.addNode("marlon", {starred: ['a', 'b', 'c', 'd'], watched: ['a', 'b', 'c', 'd']});
// g.addNode("luiz", {starred: ['a', 'b'], watched: ['a', 'c']});
// g.addNode("duhan", {starred: ['c'], watched: []});
// g.addEdge('tomer', 'marlon');
// g.addEdge('tomer', 'luiz');
// g.addEdge('marlon', 'luiz');
// g.addEdge('marlon', 'tomer');
// g.addEdge('marlon', 'duhan');
// g.addEdge('luiz', 'tomer');
// g.addEdge('luiz', 'duhan');
// g.addEdge('luiz', 'duhan');

// console.log(Recommendation.localPath('tomer', g));
