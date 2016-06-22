function Graph(){
    this.graph = {};
};

Graph.prototype.nodes = function(){
    return Object.keys(this.graph);
}

Graph.prototype.get = function(label){
    return this.graph[label];
}

Graph.prototype.exists = function(label){
    return label in Object.keys(this.graph);
}

Graph.prototype.addNode = function(label, data){
    this.graph[label] = {
        label: label,
        adj: []
    };

    if(arguments.length > 1)
        for (var attr in data) { this.graph[label][attr] = data[attr]; }
}

Graph.prototype.addEdge = function(from, to){
    if(this.graph[from].adj.indexOf(to) < 0)
        this.graph[from].adj.push(to);
}

Graph.prototype.numberOfNodes = function(){
    return Object.keys(this.graph).length
}

module.exports = Graph;