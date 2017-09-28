(function(){

//psuedo-global variables
var attrArray = ["Social_Progress_Index","Basic_Human_Needs","Foundations_of_Well-Being","Opportunity"]; //list of attributes
var rankArray = ["Rank_(SPI)","Rank_(BHN)","Rank_(FW)","Rank_(O)"];

var expressed = attrArray[0];

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 1125,
        height = 540;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Robinson projection
    var projection = d3.geoRobinson()
        .scale(200)
        .translate([(width / 2)-75, (height / 2)+40]);

    var path = d3.geoPath()
        .projection(projection);

    //use d3.queue to parallelize asynchronous data loading
    d3.queue()
        .defer(d3.csv, "data/SPI_Data.csv") //load attributes from csv
        .defer(d3.json, "data/countries.topojson") //load background spatial data
        .await(callback);

    function callback(error, csvData, world){
        //place graticule on the map
        setGraticule(map, path);

        //translate TopoJSON
        var worldCountries = topojson.feature(world, world.objects.collection).features;

        //join csv data to topojson
        worldCountries = joinData(worldCountries, csvData);

        //create color scale
        var colorScale = createColorScale(csvData);

        //add enumeration units to map
        setEnumerationUnits(worldCountries, map, path, colorScale);
        createMenu();
        drawPcp(csvData);
      };
};

function setGraticule(map, path){

    //create graticule generator
    var graticule = d3.geoGraticule()
      .step([50, 50]); //place graticule lines every 50 degrees of longitude and latitude

    //create graticule background
    var gratBackground = map.append("path")
      .datum(graticule.outline()) //bind graticule background
      .attr("class", "gratBackground") //assign class for styling
      .attr("d", path) //project graticule

    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
      .data(graticule.lines()) //bind graticule lines to each element to be created
      .enter() //create an element for each datum
      .append("path") //append each element to the svg as a path element
      .attr("class", "gratLines") //assign class for styling
      .attr("d", path); //project graticule lines

};

function joinData(worldCountries, csvData){
   //variables for data join
   var attrArray = ["Country", "Rank_(SPI)", "Social_Progress_Index", "Rank_(BHN)", "Basic_Human_Needs", "Rank_(FW)", "Foundations_of_Well-Being", "Rank_(O)", "Opportunity"];
  //loop through csv to assign each set of csv attribute values to geojson region
  for (var i=0; i<csvData.length; i++){
      var csvRegion = csvData[i]; //the current region
      var csvKey = csvRegion.adm0_a3; //the CSV primary key

  //loop through geojson regions to find correct region
  for (var a=0; a<worldCountries.length; a++){
      var geojsonProps = worldCountries[a].properties; //the current region geojson properties
      var geojsonKey = geojsonProps.adm0_a3; //the geojson primary key

      //where primary keys match, transfer csv data to geojson properties object
      if (geojsonKey == csvKey){

          //assign all attributes and values
          attrArray.forEach(function(attr){
              var val = parseFloat(csvRegion[attr]); //get csv attribute value
              geojsonProps[attr] = val; //assign attribute and value to geojson properties
          });
        };
      };
    };
  return worldCountries;
};

function setEnumerationUnits(worldCountries, map, path, colorScale){

  //add countries to map
  var countries = map.selectAll(".countries")
      .data(worldCountries)
      .enter()
      .append("path")
      .attr("class", function(d){
        return "countries " + d.properties.adm0_a3;
      })
      .attr("d", path)
      .style("fill", function(d){
        return choropleth(d.properties, colorScale);
      })
      .on("mouseover", function(d){//event that occurs when mouse is over county
        highlight(d.properties); //highlight
      })
      .on("mouseout", function(d){//event that occurs when mouse moves off county
        dehighlight(d.properties);//dehighlight
 })
      .on("mousemove", moveLabel);
  var desc = countries.append("desc")
      .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};

function createColorScale(data){

    var colorClasses = [
    "#edf8fb",
    "#bfd3e6",
    "#9ebcda",
    "#8c96c6",
    "#8856a7",
    "#810f7c"
    ];

    //create a color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values in the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale
    colorScale.domain(domainArray);

    return colorScale;
};
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };

};
function createMenu(csvData){
  var menu = d3.select("body")
        .append("div")
        .attr("class", "sidenav")
        .attr("width", 250)
        .append("a")
        .attr("class","closebtn")
        .text("-");

  var menuOptions = menu.selectAll("menuOptions")
    .append("a")
    .text("SPI")
    .text("Basic Human Needs")
    .text("Foundations of Well Being")
    .text("Opportunity");


};
function drawPcp(csvData){
   //pcp dimensions
  var width = 960;
  var height = 200;
  //create attribute names array for pcp axes
  var keys = [], attributes = [];

  //fill keys array with all property names
  for (var key in csvData[0]){
    keys.push(key);
  };

  //fill attributes array with only the attribute names
  for (var i=1; i < keys.length;  i++){
    attributes.push(keys[i]);
  };

  //create horizonatal pcp coordinate generator
  var coordinates = d3.scaleOrdinal() // create an ordinal axis scale
    .domain(attributes) //horizontally space each axis evenly
    .range([0, width]); //set the horizontal width to svg

  var axis = d3.axisLeft() //create axis generator


    //create vertical pcp scale
    scales = {}; //object to hold scale generators
    attributes.forEach(function(att){ //for each attributes
      scales[att] = d3.scaleLinear()//create linear scale generators
          .domain(d3.extent(csvData, function(data){
                return +data[att];  //create array of extents
          }))
          .range([height, 0]);  //set the axis height to SVG height
    });

    var line = d3.line();  //create line generators

    //create a new svg element with the above dimensions
    var pcplot = d3.select("body")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "pcplot") //for styling
      .append("g") //append container elementa
      .attr("transform", //change the container size/shape-rendering
        "scale(0.8, 0.6) "+//shrink
        "translate(96, 50)"); //move

    var pcpBackground = pcplot.append("rect") //background for the pcpBackground
      .attr("x", "-30")
      .attr("y", "-35")
      .attr("width", "1020")
      .attr("height", "270")
      .attr("rx", "15")
      .attr("ry", "15")
      .attr("class", "pcpBackground");


    //add lines
    var pcpLines = pcplot.append("g")  //append a container element
      .attr("class", "pcpLines")  //class for styling lines
      .selectAll("path")  //prepare for new path elements
      .data(csvData)  //bind data
      .enter() //create new path for each lines
      .append("path")  //append each line path to the container element
      .attr("id", function(d){
          return d.adm0_a3;  //id each line by admin code
      })
      .attr("d", function(d){
          return line(attributes.map(function(att){
              return [coordinates(att), scales[att] (d[att])];
          }));
      })
      .on("mouseover", highlight)
      .on("mouseout", dehighlight)
      .on("mousemove", moveLabel);
    //add axes
    var axes = pcplot.selectAll(".attribute")  //prepare for new elements
      .data(attributes)  //bind data (attribute array)
      .enter()  //create new elements
      .append("g")  //append elements as containers
      .attr("class", "axis")  //class for styling
      .attr("transorm", function(d) {
          return "translate("+coordinates(d)+")";  //position axes
      })
      .each(function(d){  //invoke the function for each axis
          d3.select(this)  //select the current axis container element
              .call(axis.scale(scales[d])  //generate the scale
                  .ticks(0)  //no ticks
                  .tickSize(0)  //no ticks
              )
          .attr("id", d) //assign the attribute name as the axis id
          .style("stroke-width", "5px")  //style each axis
          .on("click", function(){  //click listener
                // sequence(this, csvData);
          });

      });
    pcplot.select("#"+expressed)  //select the expressed attribute's axis
          .style("stroke-width", "10px");
      };
function highlight(data){
  var props = datatest(data);  //standardize json on csv data

  d3.select("#"+props.adm0_a3)  //select the current province in the domain
      .style("fill", "#000"); //set the enumeration unit fill to black

  //highlight corresponding pcp line-height
  d3.selectAll(".pcpLines")  //select the pcp lines
      .select("#"+props.adm0_a3)  //select the right pcp line-height
      .style("stroke", "#ffd700");  //restyle the line-height
    };
function setLabel(props){
  var labelAttribute = "<h1>"+props[expressed]+
                       "</h1><br><b>"+expressed+"</b>";  //label content

  var labelName = props.name;  //html string for name to go in child div

  //create info label div
  var infolabel = d3.select("body").append("div")
      .attr("class", "infolabel")  //for styling  label
      .attr("id", props.adm0_a3+"label")  //label for div
      .html(labelAttribute)  //add text
      .append("div")  //add child div for feature name
      .attr("class", "labelname")  //for styliing name
      .html(labelName);  //add feature name to label

};

function sequence(axis, csvData){

  //restyle the axis
  d3.selectAll(".axes")  //select every axis
      .style("stroke-width", "5px");  //make them all thin

  axis.style.strokeWidth = "10px";  //change selected axis thickness

  expressed = axis.id;  //change the class-level attribute variable

  //recolor the map
  d3.selectAll(".countries")  //select every countries
      .style("fill", function(d) {  //color enumeration units
          return choropleth(d, colorScale(csvData));
      })
      .select("desc")  //replace the text in each country's desc element
      .text(function(d){
          return choropleth(d, colorScale(csvData));
      });


};
//function to highlight enumeration units and bars
function highlight(props){
console.log(props.adm0_a3);
        if (props.adm0_a3 < 1){
          return false
        };
      //change stroke
      var selected = d3.selectAll("." + props.adm0_a3.replace(/ /g,"_"))//replace space with "_"
        .style("stroke", "blue")//stroke of highlight
        .style("stroke-width", "2");
        setLabel(props)//calling setLabel and pass props to to allow the label to appear when highlight on the county
};//function to dehighlight enumeration units and bars
function dehighlight(props){
      var selected = d3.selectAll("." + props.adm0_a3.replace(/ /g,"_"))
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
      };
      //turns calls into seperate funtions to get information stored in the desc element for that style
      function getStyle(element, styleName){
          var styleText = d3.select(element)
              .select("desc")
              .text();
          //then parse the JSON string to create a JSON object
          var styleObject = JSON.parse(styleText);

          return styleObject[styleName];
      };
      //function to move info label with mouse
      function moveLabel(){
        //get width of label
          var labelWidth = d3.select(".infolabel")
              .node()
              .getBoundingClientRect()
              .width;

          //use coordinates of mousemove event to set label coordinates
          var x1 = d3.event.clientX + 10,
              y1 = d3.event.clientY - 75,
              x2 = d3.event.clientX - labelWidth - 10,
              y2 = d3.event.clientY + 25;

          //horizontal label coordinate, testing for overflow
          var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
          //vertical label coordinate, testing for overflow
          var y = d3.event.clientY < 75 ? y2 : y1;

          d3.select(".infolabel")//moves label off the page so it doesnt flicker
              .style("left", x + "px")
              .style("top", y + "px");
      };
})();
