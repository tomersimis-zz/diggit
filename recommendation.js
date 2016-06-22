var _ = require('lodash');
var Graph = require('./graph.js');

var Recommendation = {};

Recommendation.getWeight = function(starred1, watched1, starred2, watched2){
	var starred = _.intersection(starred1, starred2).length/_.union(starred1, starred2).length;
	var watched = _.intersection(watched1, watched2).length/_.union(watched1, watched2).length;
	return 1;
}

Recommendation.localPath = function(root, graph){
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@ LOCAL PATH @@@@@@@@@@@@@@@@@@@@@@@@@@@")
	var l2 = {};
	var q2 = {};
	var l3 = {};

	var rootNode = graph.get(root);

	// A --> B --> Root
	var nodes = graph.nodes();
	for(var i in nodes){
		var a = graph.get(nodes[i]);
		l2[a.label] = 0;
		q2[a.label] = 0;
		var successors = a.adj;
		for(var j in successors){
			var b = graph.get(successors[j]);
			if(b.adj.indexOf(root) >= 0){
				l2[a.label] += Recommendation.getWeight(a.starred, a.watched, b.starred, b.watched);
				l2[a.label] += Recommendation.getWeight(b.starred, b.watched, rootNode.starred, rootNode.watched);
				q2[a.label]++;
			}
		}
	}

    console.log(l2);

	for(var i in nodes){
		var a = graph.get(nodes[i]);
		l3[nodes[i]] = 0;
		var successors = a.adj;
		for(var j in successors){
			var b = graph.get(successors[j]);
			l3[nodes[i]] += l2[successors[j]] + q2[successors[j]]*Recommendation.getWeight(b.starred, b.watched, rootNode.starred, rootNode.watched);
		}
	}
    var res = [];
    for(var i in l2) res.push(l2[i] + l3[i]);

    console.log(l3);
    return res;
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