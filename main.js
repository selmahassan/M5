

let keyframes = [
    {
        activeVerse: 1,
        activeLines: [1, 2, 3, 4]
    },
    {
        activeVerse: 2,
        activeLines: [1, 2, 3, 4, 5]
    },
    {
        activeVerse: 3,
        activeLines: [1, 2, 3, 4, 5]
    }
]


let keyframeIndex = 0;


document.getElementById("forward-button").addEventListener("click", forwardClicked);
document.getElementById("backward-button").addEventListener("click", backwardClicked);



const svg = d3.select("svg"),
  width = +svg.attr("width"),
  height = +svg.attr("height");

const rateByFips = new Map();
const rateByState = new Map();
const path = d3.geoPath();
const color = d3.scaleThreshold()
    .domain([0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4])
    .range(d3.schemeBlues[9]);

const x = d3.scaleLinear().domain([0, 0.5]).rangeRound([600, 860]); 


const g = svg
  .append("g")
  .attr("class", "key")
  .attr("transform", "translate(0,40)");

g.append("text")
  .attr("class", "caption")
  .attr("x", x.range()[0])
  .attr("y", -6)
  .attr("fill", "white")
  .attr("text-anchor", "start")
  .text("Incarceration rate (%)");

  g.selectAll("rect")
  .data(
    color.range().map(function (d) {
      d = color.invertExtent(d);
      if (d[0] == null) d[0] = x.domain()[0];
      if (d[1] == null) d[1] = x.domain()[1];
      return d;
    })
  )
  .enter()
  .append("rect")
  .attr("height", 8)
  .attr("x", function (d) {
    return x(d[0]);
  })
  .attr("width", function (d) {
    return x(d[1]) - x(d[0]);
  })
  .attr("fill", function (d) {
    return color(d[0]);
  });

 

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("padding", "5px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px");

// Define your state abbreviations to IDs mapping
const stateAbbreviationsToIds = {
  "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06", 
  "CO": "08", "CT": "09", "DE": "10", "FL": "12", "GA": "13", 
  "HI": "15", "ID": "16", "IL": "17", "IN": "18", "IA": "19", 
  "KS": "20", "KY": "21", "LA": "22", "ME": "23", "MD": "24", 
  "MA": "25", "MI": "26", "MN": "27", "MS": "28", "MO": "29", 
  "MT": "30", "NE": "31", "NV": "32", "NH": "33", "NJ": "34", 
  "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39", 
  "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45", 
  "SD": "46", "TN": "47", "TX": "48", "UT": "49", "VT": "50", 
  "VA": "51", "WA": "53", "WV": "54", "WI": "55", "WY": "56"
};


async function loadData() {
    const csvData = await d3.csv("incarceration_trends.csv");
    const us = await d3.json("https://d3js.org/us-10m.v1.json");

    // Process the CSV data
    const stateRates = {};
    csvData.filter(d => d.year === "2018").forEach(d => {
        const state = d.state;
        const rate = (+d.total_jail_pop / +d.total_pop) * 100;
        if (!stateRates[state]) {
            stateRates[state] = { sum: 0, count: 0 };
        }
        stateRates[state].sum += rate;
        stateRates[state].count += 1;
    });

    // Calculate average rates by state
    for (const state in stateRates) {
        const data = stateRates[state];
        rateByState.set(state, data.sum / data.count);
    }

    ready(us);
}


  
function ready(us) {
  svg.append("g")
      .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
      .enter().append("path")
      .attr("fill", d => {
          // Find the state abbreviation based on the state's numerical ID
          const stateAbbreviation = Object.keys(stateAbbreviationsToIds).find(key => stateAbbreviationsToIds[key] === d.id.toString().padStart(2, '0'));
          const rate = rateByState.get(stateAbbreviation);
          return rate ? color(rate) : "#ccc"; // Use the color scale for the rate
      })
      .attr("d", path)
      .on("mouseover", function(event, d) {
          // Find the state abbreviation based on the state's numerical ID
          const stateAbbreviation = Object.keys(stateAbbreviationsToIds).find(key => stateAbbreviationsToIds[key] === d.id.toString().padStart(2, '0'));
          const rate = rateByState.get(stateAbbreviation);
          tooltip.html(`${stateAbbreviation} Average Incarceration Rate: ${rate ? rate.toFixed(2): 'No data'}`)
              .style("visibility", "visible")
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
          tooltip.style("visibility", "hidden");
      });

  svg.append("path")
      .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
      .attr("class", "states")
      .attr("d", path);
}

loadData();


  g.call(
    d3
      .axisBottom(x)
      .tickSize(20)
      .tickFormat(function (x, i) {
        return i ? x : x;
      })
      .tickValues(color.domain())
  )
  .select(".domain")
  .remove();

d3.csv("incarceration_trends.csv").then((data) => {
    data.filter(d => d.year === "2018")
    .forEach(d => {
     
      if (d.fips.length === 4) {
          d.fips = "0" + d.fips;
      }
      rateByFips.set(d.fips, (+d.total_jail_pop / +d.total_pop) * 100);
    });

    d3.json("https://d3js.org/us-10m.v1.json").then(ready);
});





function forwardClicked() {


    if (keyframeIndex < keyframes.length - 1) {
      keyframeIndex++;
      drawKeyframe(keyframeIndex);
    }
  }
  
function backwardClicked() {
    if (keyframeIndex > 0) {
      keyframeIndex--;
      drawKeyframe(keyframeIndex);
    }
  }

  function drawKeyframe(kfi) {
    let kf = keyframes[kfi];
    
    resetActiveLines();
    updateActiveVerse(kf.activeVerse);
    for (let line of kf.activeLines) {
        updateActiveLine(kf.activeVerse, line);
    }

    if (kf.svgUpdate) {
        kf.svgUpdate(); // Call the function defined in the keyframe
    }
}


function highlightState(stateAbbreviation, highlightColor) {
  svg.selectAll(".state")
     .filter(d => {
          // This assumes the state abbreviation is stored in 'd.properties.stateAbbr'
          // Adjust if your data uses a different property name
          return d.properties.stateAbbr === stateAbbreviation;
      })
     .transition()
     .attr("fill", function(d) {
          if (highlightColor) {
              return highlightColor;
          } else {
              // Reset to the original color based on the rate
              const rate = rateByState.get(stateAbbreviation);
              return rate ? color(rate) : "#ccc";
          }
      });
}

function assignStateClass(us) {
  svg.selectAll(".state")
     .data(topojson.feature(us, us.objects.states).features)
     .enter().append("path")
     .attr("class", "state")
     .attr("d", path)
     .attr("fill", d => {
         const stateAbbreviation = Object.keys(stateAbbreviationsToIds).find(key => stateAbbreviationsToIds[key] === d.id.toString().padStart(2, '0'));
         const rate = rateByState.get(stateAbbreviation);
         return rate ? color(rate) : "#ccc";
     })
}


function resetActiveLines() {
    d3.selectAll(".line").classed("active-line", false);
}


function updateActiveVerse(id) {
    d3.selectAll(".verse").classed("active-verse", false)

    d3.select("#verse").classed("active-verse", true)
}

function updateActiveLine(vid, lid) {

  let thisVerse = d3.select("#verse" + vid);

  thisVerse.select("#line" + lid).classed("active-line", true);
}



function scrollLeftColumnToActiveVerse(id) {
  
    var leftColumn = document.querySelector(".left-column-content");


    var activeVerse = document.getElementById("verse" + id);


    var verseRect = activeVerse.getBoundingClientRect();
    var leftColumnRect = leftColumn.getBoundingClientRect();

    var desiredScrollTop = verseRect.top + leftColumn.scrollTop - leftColumnRect.top - (leftColumnRect.height - verseRect.height) / 2;


    leftColumn.scrollTo({
        top: desiredScrollTop,
        behavior: 'smooth'
    })
}

function updateActiveVerse(id) {

    d3.selectAll(".verse").classed("active-verse", false);


    d3.select("#verse" + id).classed("active-verse", true);

    scrollLeftColumnToActiveVerse(id);
}


function initialiseSVG() {
    svg.attr("width", width);
    svg.attr("height", height);

    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    chartWidth = width - margin.left - margin.right;
    chartHeight = height - margin.top - margin.bottom;

    chart = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    xScale = d3.scaleBand()
        .domain([])
        .range([0, chartWidth])
        .padding(0.1);

    yScale = d3.scaleLinear()
        .domain([])
        .nice()
        .range([chartHeight, 0]);

    svg.append("text")
        .attr("id", "chart-title")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("fill", "white")
        .text("");

}


async function initialise() {

    await loadData();

    initialiseSVG();

    drawKeyframe(keyframeIndex);
}


initialise();
