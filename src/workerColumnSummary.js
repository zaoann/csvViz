importScripts('../libs/d3/d3.min.js');

onmessage = function(e) {
    postMessage([e.data[0], summarizeCol(e.data[1])]);
}

//function isNum(x) { return !isNaN(x);}

function isInt(str) {
    return /^\-?([0-9]\d*)\.?(0*)$/.test(str);
    // regular expression test: (optional minus sign) + (0-9 digits, however many) + 
    //                              (optional decimal point) + (however many 0s)
}

function roundTo (n, p) {
    return Math.round(n*Math.pow(10,p))/Math.pow(10,p);
}

function summarizeCol (col) {
    
    //var j = msg[0];
    //var thisCol = msg[0];
    var colSet = d3.set(col);

    colSummary = new Object;

    colSummary.distinctCount = colSet.size();
    colSummary.missingCount = col.filter(function(x) { return x=="";}).length;

    //var ii = math.floor((math.random() * (thisColDistinctCount-5)));
    //colExamples = colSet.values().slice(1,1+5);

    if (col.some(isNaN)) {
        colSummary.type = ("text");
        colSummary.sum = ("N/A");
        colSummary.mean = ("N/A");
        colSummary.std = ("N/A");
        colSummary.min = ("N/A");
        colSummary.perc05 = ("N/A");
        colSummary.perc25 = ("N/A");
        colSummary.median = ("N/A");
        colSummary.perc75 = ("N/A");
        colSummary.perc95 = ("N/A");
        colSummary.max = ("N/A");
    } else {

        var numCol = col.map(Number).sort(d3.ascending);

        colSummary.sum = (d3.sum(numCol));
        colSummary.mean = (roundTo(d3.mean(numCol),4));
        colSummary.std = (roundTo(d3.deviation(numCol),4));
        colSummary.min = (d3.min(numCol));
        colSummary.perc05 = (d3.quantile(numCol, 0.05));
        colSummary.perc25 = (d3.quantile(numCol, 0.25));
        colSummary.median = (d3.median(numCol));
        colSummary.perc75 = (d3.quantile(numCol, 0.75));
        colSummary.perc95 = (d3.quantile(numCol, 0.95));
        colSummary.max = (d3.max(numCol));

        if (colSummary.min == colSummary.max) {
            if (col.length == colSummary.missingCount) {
                colSummary.type = "missing";
            } else {
                colSummary.type = "constant";
            };
        } else if (col.some(function(x) {return !isInt(x);})) {
            colSummary.type = "real";
        } else {
            colSummary.type = "integer";
        };

    };

        /*
        var cntDistinct = csvCrossfilter.dimension(function (d) {
            return d[cols[j]];
        }).group().size();
    
        var colSum = csvCrossfilter.groupAll().reduceSum(function (d) {
            return d[cols[j]];}).value();
            */
        //colSummary.push(["number", cntDistinct, colSum]);

    //return [j, colSummaryT, colExamples];
    return colSummary;
}
