var _ = require('lodash');

var Recommendation = {};

Recommendation.getWeight = function(starred1, watched1, starred2, watched2){
	var starred = _.intersection(starred1, starred2).length/_.union(starred1, starred2).length;
	var watched = _.intersection(watched1, watched2).length/_.union(watched1, watched2).length;
	return starred*watched;
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
		l2[nodes[i]] = 0;
		q2[nodes[i]] = 0;
		var successors = a.adj;
		for(var j in successors){
			var b = graph.get(successors[j]);
			if(b.adj.indexOf(root) >= 0){
				l2[nodes[i]] += Recommendation.getWeight(a.starred, a.watched, b.starred, b.watched);
				l2[nodes[i]] += Recommendation.getWeight(b.starred, b.watched, rootNode.starred, rootNode.watched);
				q2[nodes[i]]++;
			}
		}
	}

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
    return res;
}

module.exports = Recommendation;