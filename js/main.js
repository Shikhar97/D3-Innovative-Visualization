let planet_data;
let data_file = "data/cleaned_5250.csv";
let default_year = ["2017"]
let icon_map = {
    "Super Earth": "sat",
    "Terrestrial": "mars",
    "Gas Giant": "jupi",
    "Unknown": "merc",
    "Neptune-like": "np"
}, planet_map = {}, unit_map = {
    "stellar_magnitude": "(Brightness)",
    "orbital_radius": "(in Astronomical Unit)",
    "orbital_period": "(in Years)",
    "eccentricity": "",
    "mass_multiplier": "",
    "radius_multiplier": ""
};
let margin, width, height, opacity = 1;
let svg, Tooltip, node;


document.addEventListener('DOMContentLoaded', function () {
    Promise.all([d3.csv(data_file)])
        .then(function (values) {
            console.log('loaded ' + data_file);

            // Defining the margin for the svg
            margin = {top: 150, right: 10, bottom: 200, left: -100};
            width = 900 - margin.left - margin.right;
            height = 600 - margin.top - margin.bottom;

            planet_data = values[0];
            planet_data.forEach(function (d) {
                planet_map[d['name']] = d["icon"];
            });

            // Appending SVG
            svg = d3.select("#bubble_div")
                .append("svg")
                .attr("height", height + margin.top + margin.bottom)
                .attr("width", width + margin.left + margin.right)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


            // Create a tooltip
            Tooltip = d3.select("#bubble_div")
                .append("div")
                .style("opacity", 0)
                .attr("class", "tooltip")
                .style("background-color", "white")
                .style("border", "solid")
                .style("border-width", "2px")
                .style("border-radius", "5px")
                .style("padding", "10px")
                .style("width", "fit-content")
                .style("position", "absolute")
                .style("font-weight", "550")

            const size = d3.scaleLinear()
                .domain([0, 140])
                .range([7, 55])

            drawBubbleChart(default_year);
        });
});

function applyParams(id) {
    let e = document.querySelector("#bubble_div > svg");
    while (e.lastElementChild) {
        e.removeChild(e.lastElementChild);

    }

    e = document.querySelector("#radar_div");
    while (e.lastElementChild) {
        e.removeChild(e.lastElementChild);

    }
    document.getElementById("planet_name").textContent = "N/A"
    svg = d3.select("#bubble_div > svg")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    drawBubbleChart([document.getElementById("planet_year").value], "planet_type");
}


function getData(year) {
    const planets = getPlanets(year);
    let data = [];
    planet_data.filter(function (d) {
        if (planets.includes(d["name"])) {
            data.push(d);
        }
    });
    data = data.sort(() => Math.random() - 0.5).slice(0, 250)
    return data;
}


function getPlanets(year) {
    return planet_data.filter(function (d) {
        if (year.includes(d["discovery_year"])) {
            return d;
        }
    }).map(d => d["name"]);
}

function drawBubbleChart(year, attribute = "planet_type") {
    const data = getData(year);

    const color = d3.scaleOrdinal()
        .domain([...new Set(planet_data.map(d => d[attribute]))])
        .range(d3.schemeSet2);

    const size = d3.scaleLinear()
        .domain([0, 140])
        .range([7, 55])

    const mouseover = function (event, d) {
        Tooltip
            .style("opacity", 1)
    }
    const mousemove = function (event, d) {
        Tooltip
            .html(
                `<span>Planet Name: ${d["name"]}</span>
                 <br><span>Planet Type: ${d["planet_type"]}</span>
                 <br><span>Distance from Earth (Light years): ${d["distance"]}</span>
                 <br><span>Discoverd in: ${d["discovery_year"]}</span>
                 <br><span>Discovery Method: ${d["detection_method"]}</span>`)
            .style("top", event.pageY - 500 + "px")
            .style("left", event.pageX + 10 + "px")
    }
    const mouseleave = function (event, d) {
        Tooltip
            .style("opacity", 0)
    }

    const mousedowned = function (event, d, i) {
        d3.select(this).transition()
            .attr("width", d => size(+d["radius_multiplier"] * 100))
            .attr("height", d => size(+d["radius_multiplier"] * 100))
            .transition()
            .attr("width", d => size(+d["radius_multiplier"] * 50))
            .attr("height", d => size(+d["radius_multiplier"] * 50))
        drawRadarChart(this.id);
        document.getElementById("planet_name").textContent = `${this.id}`
    }

    node = svg.selectAll(".planet")
        .data(data)
        .enter()
        .append("image")
        .attr("class", "planet")
        .attr("id", d => d["name"])
        .attr("xlink:href", function (d) {
            let planet = planet_map[d["name"]];
            return "icons/" + planet + ".png";
        })
        .attr("width", d => size(+d["radius_multiplier"] * 50))
        .attr("height", d => size(+d["radius_multiplier"] * 50))
        .attr("x", width / 2)
        .attr("y", height / 2)
        .style("stroke-width", 1)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
        .on("mousedown", mousedowned)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    const simulation = d3.forceSimulation()
        .force("center", d3.forceCenter().x(width / 2).y(height / 2))
        .force("charge", d3.forceManyBody().strength(.5))
        .force("collide", d3.forceCollide().strength(.3).radius(function (d) {
            return (size(+d["radius_multiplier"] * 20) + 3);
        }).iterations(10))

    function dragstarted(event, d) {
        if (!event.active) simulation.alpha(.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alpha(.3).restart();
        d.fx = null;
        d.fy = null;
    }

    simulation
        .nodes(data)
        .on("tick", function (d) {
            node
                .attr("x", function (d) {
                    return d.x;
                })
                .attr("y", function (d) {
                    return d.y;
                })
        });

    // ---------------------------//
    //       LEGEND              //
    // ---------------------------//

    const s = 20
    const allgroups = [...new Set(planet_data.map(d => d[attribute]))]
    svg.selectAll("my_rect")
        .data(allgroups)
        .join("image")
        .attr("xlink:href", function (d) {
            let planet = icon_map[d];
            return "icons/" + planet + ".png";
        })
        .attr("x", 880)
        .attr("y", (d, i) => -80 + i * (s + 5))
        .attr("width", size(25))
        .attr("height", size(25))

    svg.selectAll("my_labels")
        .data(allgroups)
        .enter()
        .append("text")
        .attr("x", 880 + s * 1.5)
        .attr("y", (d, i) => -80 + i * (s + 5) + (s / 2))
        .text(d => d)
        .attr("text-anchor", "left")
        .style("fill", "white")
        .style("alignment-baseline", "middle")
        .style("font-size", "15px")
        .style("font-weight", "400");
}

function zoomed({transform}) {
    node.attr("transform", transform);
}

function getRadarChartData(name) {
    let columns = ["mass_multiplier", "stellar_magnitude", "radius_multiplier", "orbital_radius", "orbital_period", "eccentricity"]
    let data = [];
    planet_data.filter(function (d) {
        if (d["name"] === name) {
            let temp = [];
            for (let i in d) {
                if (columns.includes(i)) {
                    temp.push({axis: i, value: +d[i]});
                }
            }
            data.push(temp);
        }
    });
    return data;

}

function drawRadarChart(name, attribute = "planet_type") {
    let e = document.querySelector("#radar_div");
    while (e.lastElementChild) {
        e.removeChild(e.lastElementChild);

    }
    let radial_data = getRadarChartData(name)
    const axesLength = radial_data[0].length;
    const axisLabelFactor = 1.15
    const axisCircles = 2, dotRadius = 4;
    const radius = (600 - (150 * 2)) / 2
    const margin1 = 10;
    const angleSlice = Math.PI * 2 / axesLength;
    const axesDomain = radial_data[0].map(d => d.axis);
    const maxValue = d3.max(radial_data[0].map(d => d.value)) + 1;
    const device = d => [...new Set(planet_data.map(d => d[attribute]))][d];
    const radarLine = d3.lineRadial()
        .curve(d3["curveCardinalClosed"])
        .radius(d => rScale(d))
        .angle((d, i) => i * angleSlice)

    const radarcolor = d3.scaleOrdinal()
        .domain([...new Set(planet_data.map(d => d[attribute]))])
        .range(["#EDC951"]);

    const rScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, radius])

    const radial_svg = d3.select("#radar_div")
        .append("svg")
        .attr("height", 550)
        .attr("width", 550)
        .append("g")

    const containerWidth = 500 - (margin1 * 2);
    const containerHeight = 500 - (margin1 * 2);
    const container = radial_svg.append('g')
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr('transform', `translate(${(400 / 2) + margin1}, ${(400 / 2) + margin1})`);

    const axisGrid = container.append("g")
        .attr("class", "axisWrapper");

    axisGrid.selectAll(".levels")
        .data(d3.range(1, (axisCircles + 1)).reverse())
        .enter()
        .append("circle")
        .attr("class", "gridCircle")
        .attr("r", (d, i) => radius / axisCircles * d)
        .style("fill", "#CDCDCD")
        .style("stroke", "#CDCDCD")
        .style("fill-opacity", 0.1);

    axisGrid.selectAll(".axisLabel")
        .data(d3.range(1, (axisCircles + 1)).reverse())
        .enter().append("text")
        .attr("class", "axisLabel")
        .attr("x", 4)
        .attr("y", function (d) {
            return -d * radius / axisCircles;
        })
        .attr("dy", "0.4em")
        .style("font-size", "10px")
        .attr("fill", "#737373")
        .text(function (d, i) {
            return Math.floor(maxValue * d / axisCircles);
        });

    const axis = axisGrid.selectAll(".axis")
        .data(axesDomain)
        .enter()
        .append("g")
        .attr("class", "axis");

    axis.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => rScale(maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y2", (d, i) => rScale(maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2))
        .attr("class", "line")
        .style("stroke", "white")
        .style("stroke-width", "2px");

    axis.append("text")
        .attr("class", "legend")
        .style("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("dy", "0.45em")
        .attr("x", (d, i) => rScale(maxValue * axisLabelFactor) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (d, i) => rScale(maxValue * axisLabelFactor) * Math.sin(angleSlice * i - Math.PI / 2))
        .text(d => d.replace("_", " ").toUpperCase());

    const plots = container.append('g')
        .selectAll('g')
        .data(radial_data)
        .join('g')
        .attr("data-name", (d, i) => device(i))
        .attr("fill", "none");

    plots.append('path')
        .attr("d", d => radarLine(d.map(v => v.value)))
        .attr("fill", (d, i) => radarcolor(i))
        .attr("fill-opacity", 0.1)
        .attr("stroke", (d, i) => radarcolor(i))
        .attr("stroke-width", 2);

    plots.selectAll("circle")
        .data(d => d)
        .join("circle")
        .attr("r", dotRadius)
        .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
        .style("fill", (d, i) => radarcolor(d))
        .attr("stroke", (d, i) => radarcolor(d));

    let columns = ["mass_multiplier", "stellar_magnitude", "radius_multiplier", "orbital_radius", "orbital_period", "eccentricity"]
    const s = 20
    radial_svg.selectAll("my_radial_key")
        .data(columns)
        .enter()
        .append("text")
        .attr("x", -30 + s * 1.5)
        .attr("y", (d, i) => 430 + i * (s + 5) + (s / 2))
        .text(d => d.replace("_", " ").toUpperCase() + " " + unit_map[d] + " : ")
        .attr("text-anchor", "left")
        .style("fill", "black")
        .style("alignment-baseline", "middle")
        .style("font-size", "15px")
        .style("font-style", "italic")
        .style("font-weight", "400");

    radial_svg.selectAll("my_radial_labels")
        .data(columns)
        .enter()
        .append("text")
        .attr("x", 260 + s * 1.5)
        .attr("y", (d, i) => 430 + i * (s + 5) + (s / 2))
        .text(function (d) {
            let wrt_var;
            let p_data;
            planet_data.filter(function (planet) {
                if (planet["name"] === name) {
                    wrt_var = planet[d.split("_")[0] + "_wrt"]
                    p_data = planet;
                }
            });
            if (["mass_multiplier", "radius_multiplier"].includes(d)) {
                return `${p_data[d]} w.r.t ${wrt_var}`
            } else {
                return `${p_data[d]}`
            }

        })
        .attr("text-anchor", "left")
        .style("fill", "#e66104")
        .style("alignment-baseline", "middle")
        .style("font-size", "15px")
        .style("font-style", "italic")
        .style("font-weight", "400");

}
