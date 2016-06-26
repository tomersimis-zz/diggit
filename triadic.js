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
    fc = graph.get(node).followers_count;
     console.log('node_score_fc('+node+') = ' + fc + ' | tc: ' + transitiveCount[node]);
    // return 1;
    return (1/(Math.pow(!fc ? 1 : fc, 1.2)));
}

function triad_score(node_a, node_b, node_c){
    mask = 0;
    // if(node_b != 'tomersimis') return 0;

    // console.log('a: '+ node_a + ' | b: ' + node_b + ' | c: ' + node_c);
    update_mask_edge_AB(node_a, node_b);
    // console.log('[2] mask: ' + mask);
    update_mask_edge_BC(node_b, node_c);
    //console.log('[3] mask: ' + mask);
    freq_triad = freq[mask];
    freq_foward = freq[paralel_triadic_foward(mask)];
    freq_bidir= freq[paralel_triadic_bidir(mask)];

    /*
    console.log(freq_triad);
    console.log(freq_foward);
    console.log(freq_bidir);
    */

    return !freq_triad ? 0 : (freq_foward + freq_bidir)/freq_triad;
}


function evaluate(node_a, node_b){
    // if(node_b != 'plesner') return 0;
    adj_list = graph.get(node_a).adj.concat(graph.get(node_b).adj);
    adj_list.filter(function onlyUnique(value, index, self) {
                        return self.indexOf(value) === index;
                    });

    sum = 0.0;
    for(var i = 0; i < adj_list.length; i++){
        adj = adj_list[i];
        // console.log('adj: ' + adj);

        ts = triad_score(node_a, adj, node_b);
        ns = node_score(adj);
        // console.log('ts: ' + ts + ' | ns:'  + ns);
        sum += ts*ns;
    }
    sum *= log(1.2, transitiveCount[node_b]);

    sum *= 10000;
    console.log('Score('+graph.get(node_a).label+', ' + graph.get(node_b).label+') = ' + sum);

    return sum;
}


Triadic.build = function(mygraph){
    for(i = 0; i <= 256; i++) freq[i] = 0;

    cache_mask = []
    graph = mygraph;
    mask = 0;
    var nodes = graph.nodes();



    for(var i = 0; i < nodes.length; i++){
        mask = 0;
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

Triadic.getRecommendations = function(node){
    recommend_list = [];
    worst_score = INF;
    var nodes = graph.nodes();
    for(var i = 0; i < nodes.length; i++){ transitiveCount[nodes[i]] = 1; }
    for(var i = 0; i < nodes.length; i++){
        curr = nodes[i];
        // if(curr != 'Ariin') continue;

        if(graph.get(node).adj.indexOf(curr) >= 0 || node == curr) continue;

        for(var j = 0; j < graph.get(node).adj.length; j++){
            adj = graph.get(node).adj[j];
            if(graph.get(adj).adj.indexOf(curr) >= 0) transitiveCount[curr]++;
        }
        curr_score = evaluate(node, curr);

        recommend_list.push([curr_score, curr]);
        if(recommend_list.length >= 200) break;
    }

    recommend_list.sort(function(first, second){
        return second[0] - first[0];
    });

    return recommend_list.map(function(curr){
        var pre = graph.get(curr[1]).pre;
        pre.push(curr[1]);
        return {
            login: curr[1],
            avatar: graph.get(curr[1]).avatar,
            pre: pre.map(function(p){ return { pavatar: graph.get(p).avatar } }),
            score: curr[0].toFixed(2),
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
g.addEdge('marlon', 'tomer');
g.addEdge('tomer', 'luiz');
g.addEdge('luiz', 'duhan');
g.addEdge('duhan', 'tomer');
console.log(g.nodes());
Triadic.build(g)
for(var i = 0; i < 256; i++) if(freq[i]) console.log('freq['+i+']: ' + freq[i]);
Triadic.getRecommendations('marlon').filter(function(x){
    return [x.login, x.score];
});

    A
B      C

*/
