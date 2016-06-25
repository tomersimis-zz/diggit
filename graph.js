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
    nodes = Object.keys(this.graph);
    graph = this.graph;
    for(var i = 0; i < nodes.length; i++){
        this.graph[nodes[i]].adj = this.graph[nodes[i]].adj.filter(function(node){
            if(node == 'rodrigoalvesvieira'){
                console.log(graph[node]);
            }
            return graph[node].level < level;
        });
    }
    for(var i = 0; i < nodes.length; i++){
        if(this.graph[nodes[i]].level >= level){
            delete this.graph[nodes[i]];
        }
    }
}

Graph.prototype.tryAddNode = function(label, data){
    if(this.exists(label)) return;
    // console.log('adding to graph node: ' + label);
    this.graph[label] = {
        label: label,
        adj: [],
        pre: []
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
