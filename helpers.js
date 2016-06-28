var Helpers = {};

Helpers.formatList = function(list){
    var str = '';
    if(list.length == 0){
        str += ' - ';
    }else{
        str += list[0];
        if(list.length > 1) str += ", " + list[1];
        if(list.length > 2)  str += " and " + (list.length - 2) + " others";
    }
    return str;
}

Helpers.clean = function(list){
    var clean = [];
    for(var i=0; i < list.length; i++){
        if(list[i] && list[i] != 'undefined' && list[i] != 'null' && list[i].length > 0) clean.push(list[i]);
    }
    return clean;
}

module.exports = Helpers;
