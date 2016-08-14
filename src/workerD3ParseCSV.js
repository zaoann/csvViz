importScripts('../libs/d3/d3.min.js');

onmessage = function(e) {
    postMessage([e.data[0], d3.csv.parse(e.data[1])]);
}
