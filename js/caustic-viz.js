$(document).ready(function() {
/*    var data = [4, 8, 15, 16, 23, 42],
    chart = d3.select("body").append("svg")
        .attr("class", "chart")
        .attr("width", 440)
        .attr("height", 140)
        .append("g")
        .attr("transform", "translate(10,15)"),
    x = d3.scale.sqrt()
        .domain([0, d3.max(data)])
        .range([0, 440]),
    y = d3.scale.ordinal()
        .domain(data)
        .rangeBands([0, 110]);

    chart.selectAll("rect")
        .data(data)
        .enter().append("rect")
        .attr("y", y)
        .attr("width", x)
        .attr("height", y.rangeBand());

    chart.selectAll("text")
        .data(data)
        .enter().append("text")
        .attr("x", x)
        .attr("y", function(d) { return y(d) + y.rangeBand() / 2; })
        .attr("dx", -3) // padding-right
        .attr("dy", ".35em") // vertical-align: middle
        .attr("text-anchor", "end") // text-align: right
        .text(String);

    chart.selectAll("line")
        .data(x.ticks(10))
        .enter().append("line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", 0)
        .attr("y2", 120)
        .style("stroke", "#ccc");

    chart.selectAll(".rule")
        .data(x.ticks(10))
        .enter().append("text")
        .attr("class", "rule")
        .attr("x", x)
        .attr("y", 0)
        .attr("dy", -3)
        .attr("text-anchor", "middle")
        .text(String);

    chart.append("line")
        .attr("y1", 0)
        .attr("y2", 120)
        .style("stroke", "#000");*/

    var t = 1297110663, // start time (seconds since epoch)
    v = 70, // start value (subscribers)
    data = d3.range(33).map(next); // starting dataset

    function next() {
        return {
            time: ++t,
            value: v = ~~Math.max(10, Math.min(90, v + 10 * (Math.random() - .5)))
        };
    }

    setInterval(function() {
        data.shift();
        data.push(next());
        redraw();
    }, 1500);

    var w = 20,
    h = 80;

    var x = d3.scale.linear()
        .domain([0, 1])
        .range([0, w]);

    var y = d3.scale.linear()
        .domain([0, 100])
        .rangeRound([0, h]);

    var chart = d3.select("body").append("svg")
        .attr("class", "chart")
        .attr("width", w * data.length - 1)
        .attr("height", h);

    chart.selectAll("rect")
        .data(data)
        .enter().append("rect")
        .attr("x", function(d, i) { return x(i) - .5; })
        .attr("y", function(d) { return h - y(d.value) - .5; })
        .on("click", function(evt) { console.log(evt); })
        .attr("width", w)
        .attr("height", function(d) { return y(d.value); });

    chart.append("line")
        .attr("x1", 0)
        .attr("x2", w * data.length)
        .attr("y1", h - .5)
        .attr("y2", h - .5)
        .style("stroke", "#000");

    function redraw() {

        // Update…
        chart.selectAll("rect")
            .data(data)
            .transition()
            .duration(1000)
            .attr("y", function(d) { return h - y(d.value) - .5; })
            .attr("height", function(d) { return y(d.value); });

    }
});
