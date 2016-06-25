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

module.exports = Helpers;
