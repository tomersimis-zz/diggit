function Graph(){
    this.graph = {};
};

Graph.prototype.existsEdge = function(node_a, node_b){
    return this.graph[node_a].adj.indexOf(node_b) >= 0;
}

Graph.prototype.nodes = function(){
    return Object.keys(this.graph);
}

Graph.prototype.get = function(label){
    return this.graph[label];
}

Graph.prototype.exists = function(label){
    return Object.keys(this.graph).indexOf(label) >= 0;
}

Graph.prototype.removeNodesBellow = function(level){
     proc = {};
    nodes = Object.keys(this.graph);
    graph = this.graph;
    for(var i = 0; i < nodes.length; i++){
        this.graph[nodes[i]].adj = this.graph[nodes[i]].adj.filter(function(node){
            return this.graph[node].level <= level;
        });
    }
    for(var i = 0; i < nodes.length; i++){
        if(this.graph[nodes[i]].level > level){
            delete this.graph[nodes[i]];
        }
    }
}

var proc = {};
var q = [];
Graph.prototype.printGraph = function(node, l){
    q.push([node,l]);
    proc[node] = true;
    while(q.length != 0){
        x = q.shift();
        var node = x[0]; var l = x[1];
        proc[node] = true;
        this.graph[node].level = l;
        console.log('Node: ' + node + ' | lv: ' + l);
        for(var i = 0; i < this.get(node).adj.length; i++){
            adj = this.get(node).adj[i];
            console.log('Adj: ' + adj);
        }
        for(var i = 0; i < this.get(node).adj.length; i++){
            adj = this.get(node).adj[i];
            if(proc[adj] == undefined){
                proc[adj] = true;
                q.push([adj, l+1]);
            }
        }
    }
}

Graph.prototype.delete_node = function(node){
    var nodes = Object.keys(this.graph);
    for(var i = 0; i < nodes.length; i++){
        var curr = nodes[i];
        if(curr == node) continue;
        var idx = this.graph[curr].indexOf(node);
        if(idx >= 0){
            this.graph[curr].adj.splice(idx, 1);
        }
    }
    delete this.graph[node];
}

Graph.prototype.tryAddNode = function(label, data){
    if(this.exists(label)) return;
    this.graph[label] = {
        label: label,
        adj: [],
        pre: [],
        transitive_count: 0,
    };

    if(arguments.length > 1)
        for (var attr in data) { this.graph[label][attr] = data[attr]; }
}

Graph.prototype.addEdge = function(from, to){
    if(this.graph[from].adj.indexOf(to) < 0)
        this.graph[from].adj.push(to);
    if(this.graph[to].pre.indexOf(from) < 0)
        this.graph[to].pre.push(from);
}

Graph.prototype.numberOfNodes = function(){
    return Object.keys(this.graph).length
}

module.exports = Graph;
