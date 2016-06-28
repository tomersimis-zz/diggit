var _ = require('lodash');
var Graph = require('./graph.js');
var Helpers = require('./helpers.js');
var graph;

var Triadic = {};

var transitiveCount = {};

var freq = [];

var mask;

var INF = 0x3f3f3f3f3f;

var RECOMMEND_LIST_MAX_SIZE = 50;

/*
Triad:
   B
 A  C
*/

function update_mask_edge_AB(node_a, node_b){
    before = mask;
    mask |= graph.existsEdge(node_b, node_a)*2;
    mask |= graph.existsEdge(node_a, node_b)*1;
    return before != mask;
}

function update_mask_edge_BC(node_b, node_c){
    before = mask;
    mask |= graph.existsEdge(node_c, node_b)*8;
    mask |= graph.existsEdge(node_b, node_c)*4;
    return before != mask;
}

function update_mask_edge_AC(node_a, node_c){
    before = mask;
    mask |= graph.existsEdge(node_c, node_a)*32;
    mask |= graph.existsEdge(node_a, node_c)*16
    return before != mask;
}

var mask_stack = [];
function save_mask(){
    if(mask_stack.length != 0 && mask_stack[mask_stack.length-1] == mask) return;
    mask_stack.push(mask);
}
function load_mask(){
    mask = mask_stack.length == 0 ? 0 : mask_stack.pop();
}

function paralel_triadic_foward(mask){
    return mask|16;
}

function paralel_triadic_bidir(mask){
    return mask|32;
}

function log(b,k){
    return Math.log(Math.max(b,k))/Math.log(b);
}

function node_score(node){
    fc = graph.get(node).followers_count.length;
    f = (1/(Math.pow(!fc ? 1 : fc, 1.1)));
    return f;
}

function triad_score(node_a, node_b, node_c){
    mask = 0;
    update_mask_edge_AB(node_a, node_b);
    update_mask_edge_BC(node_b, node_c);
    freq_triad = freq[mask];
    freq_foward = freq[paralel_triadic_foward(mask)];
    freq_bidir= freq[paralel_triadic_bidir(mask)];
    return !freq_triad ? 0 : (freq_foward + freq_bidir)/freq_triad;
}


function evaluate(node_a, node_b){
    adj_list = graph.get(node_a).adj.concat(graph.get(node_b).adj);
    adj_list.filter(function onlyUnique(value, index, self) {
                        return self.indexOf(value) === index;
                    });
    sum = 0.0;
    for(var i = 0; i < adj_list.length; i++){
        adj = adj_list[i];
        ts = Math.min(triad_score(node_a, adj, node_b)*10, 1)+1;
        ns = node_score(adj);
        //console.log('ts: ' + ts + ' | ns:'  + ns);
        sum += ts*ns;
    }
    sum *= Math.exp(1.6, transitiveCount[node_b]);
    sum *= 1000;
    //console.log('Score('+graph.get(node_a).label+', ' + graph.get(node_b).label+') = ' + sum);
    //console.log('TC('+graph.get(node_b).label+') = ' + transitiveCount[node_b]);
    return sum;
}

Triadic.build = function(mygraph){
    for(i = 0; i <= 256; i++) freq[i] = 0;
    cache_mask = []
    graph = mygraph;
    graph.removeNodesBellow(2);
    mask = 0;
    var nodes = graph.nodes();
    for(var i = 0; i < nodes.length; i++){
        mask = 0;
        if(graph.get(nodes[i]).level >= 3) 1/0;
        for(var j = i+1; j < nodes.length; j++){
            save_mask();
            if(update_mask_edge_AB(nodes[i], nodes[j])){
                for(var k = j+1; k < nodes.length; k++){
                    save_mask();
                    if(update_mask_edge_BC(nodes[j],nodes[k])) {
                        freq[mask]++;
                        if(update_mask_edge_AC(nodes[i], nodes[k])){
                            freq[mask]++;
                        }
                    }
                    load_mask();
                }
            }
            load_mask();
        }
    }
}

Triadic.mapScore = function(score, max){
    return Math.max(0, 5.0*score/max);
}

Triadic.getRecommendations = function(node){
    recommend_list = [];
    worst_score = INF;
    var nodes = graph.nodes();
    for(var i = 0; i < nodes.length; i++){ transitiveCount[nodes[i]] = 0; }

    for(var i = 0; i < nodes.length; i++){
        var curr = nodes[i];

        if(graph.get(node).adj.indexOf(curr) >= 0 || node == curr) continue;

        curr_score = evaluate(node, curr);

        recommend_list.push([curr_score, curr]);
    }

    recommend_list.sort(function(first, second){
        return second[0] - first[0];
    });
    max_score = (recommend_list.length > 0) ? recommend_list[0][0] : 1;
    return recommend_list.map(function(curr){
        return {
            login: curr[1],
            avatar: graph.get(curr[1]).avatar,
            score: Triadic.mapScore(curr[0],max_score).toFixed(2),
            commonStarred: Helpers.formatList(_.intersection(graph.get(curr[1]).starred, graph.get(node).starred)),
            commonWatched: Helpers.formatList(_.intersection(graph.get(curr[1]).watched, graph.get(node).watched)),
            commonLanguages: Helpers.formatList(_.intersection(graph.get(curr[1]).languages, graph.get(node).languages))
        }
    });
}


module.exports = Triadic;


// Test
/*
var g = new Graph();
g.tryAddNode("marlon", {starred: ['a', 'b', 'c'], watched: ['a', 'b', 'c'], followers_count: 10});
g.tryAddNode("tomer", {starred: ['a', 'b', 'c', 'd'], watched: ['a', 'b', 'c', 'd'], followers_count: 10});
g.tryAddNode("luiz", {starred: ['a', 'b'], watched: ['a', 'c'], followers_count: 10});
g.tryAddNode("duhan", {starred: ['a', 'b'], watched: ['a', 'c'], followers_count: 10});
g.tryAddNode("carlos", {starred: ['a', 'b'], watched: ['a', 'c'], followers_count: 10});
g.addEdge('marlon', 'tomer');
g.addEdge('marlon', 'carlos');
g.addEdge('carlos', 'duhan');
g.addEdge('tomer', 'luiz');
g.addEdge('luiz', 'duhan');
g.addEdge('duhan', 'tomer');
console.log(g.nodes());
Triadic.build(g);
g.printGraph("marlon", 0);
console.log('## REMOVING BELLOW ##');
g.removeNodesBellow(2);
g.printGraph("marlon", 0);


for(var i = 0; i < 256; i++) if(freq[i]) console.log('freq['+i+']: ' + freq[i]);
Triadic.getRecommendations('marlon').filter(function(x){
    return [x.login, x.score];
});

    A
B      C

*/
