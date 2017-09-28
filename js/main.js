(function(){

//psuedo-global variables
var attrArray = ["Social_Progress_Index","Basic_Human_Needs","Foundations_of_Well-Being","Opportunity"]; //list of attributes
var rankArray = ["Rank_(SPI)","Rank_(BHN)","Rank_(FW)","Rank_(O)"];
var formalName = ["Social Progress Index","Basic Human Needs","Foundations of Well-Being","Opportunity"];
var expressed = attrArray[0];
var expressedRank = rankArray[0];
var expressedName = formalName[0];
// var definitions = [
// "The Social Progress Index measures the extent to which countries provide for the social and environmental needs of their citizens",
// "The Basic Human Needs Dimension assesses how well a country provides for its people’s essential needs by measuring access to nutrition and basic medical care, if they have access to safe drinking water, if they have access to adequate housing with basic utilities, and if society is safe and secure.",
//
// "The Foundations of Well-Being Dimension measures whether citizens have access to basic education, can access information and knowledge from both inside and outside their country, and if there are the conditions for living healthy lives.",
//
// "The Opportunity Dimension measures the degree to which a country’s citizens have personal rights and freedoms and are able to make their own personal decisions as well as whether prejudices or hostilities within a society prohibit individuals from reaching their potential."
//
// ];

// console.log(definitions[3]);
//begin script when window loads
window.onload = setMap();
//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 1500,
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

        //create parallel coordinate plot
        drawPcp(csvData);

        //add a sidepanel to change mapped attribute

        createSidepanel(csvData);
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

          rankArray.forEach(function(attr){
              var valRank = parseFloat(csvRegion[attr]); //get csv attribute value
              geojsonProps[attr] = valRank; //assign attribute and value to geojson properties
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
      //.on("mousemove", moveDefLabel)
      .on("mousemove", moveLabel);
        var desc = countries.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');




};

function createColorScale(data, width){
    //colors for color scale
    var colorClasses = [
      "#810f7c",
      "#8856a7",
      "#8c96c6",
      "#9ebcda",
      "#bfd3e6",
      "#edf8fb"

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

function createSidepanel(csvData){
  $( "#accordion" ).accordion({ //create accordion with jquery
    active: 0
  });
  $( ".accordionTitle" ).on("click", function(){
    var thisID = $(this).attr("id")
          changeAttribute(thisID, csvData);
          d3.selectAll(".axis").select("path").style("stroke", "#fff");// change axis back to white when next attribute is clicked
          d3.selectAll("."+thisID).select("path").style("stroke", "#dbdc01");  //change axis to yellow when attribute is clicked

      });


  // $( ".axis").on("click", function(){
  //   // highlight($(style("stroke", "#dbdc01"))
  //
  // });



};


function changeAttribute(attribute, csvData){
    //change expressed attribute
    expressed = attribute;
    if(attribute == "Social_Progress_Index"){
      expressedRank = "Rank_(SPI)";
      expressedName = "Social Progress Index";
    }
    if (attribute == "Basic_Human_Needs") {
      expressedRank = "Rank_(BHN)";
      expressedName = "Basic Human Needs";
    };
     if (attribute=="Foundations_of_Well-Being") {
        expressedRank = "Rank_(FW)";
        expressedName = "Foundations of Well-Being";
    };
     if (attribute=="Opportunity" ) {
        expressedRank = "Rank_(O)";
        expressedName = "Opportunity";
    };
    //change color scale
    var colorScale = createColorScale(csvData);
    //recolor countries based on expressed attribute
    var countries = d3.selectAll(".countries")
        .style("fill", function(d){
          return choropleth(d.properties, colorScale)
        });
};

// $( "#accordion" ).accordion({
//   disabled: true
// });
// // Getter
// var active = $( "#accordion" ).accordion( "option", "active" );
//
// // Setter
// $( "#accordion" ).accordion( "option", "active", 2 );


function openNav() {

    var sideNav= d3.select("#mySidenav");
    sideNav.style("width","250px")
};
function closeNav() {
  var sideNav= d3.select("#mySidenav");
  sideNav.style("width","0px")
};

var spiDefPanel = d3.select("#SPI")
  .on("mouseover", function(){
          var infolabel = d3.select("body")
          .append("div")
          .attr("class", "definitionlabel")  //for styling  label
          .attr("id", "deflabel")  //label for div
          .html(definitions[0]);  //add text
        })
        .on("mouseout", function(){
        d3.select(".definitionlabel")
        .remove();
         });

var bhnDefPanel = d3.select("#BHN")
  .on("mouseover", function(){
          var infolabel = d3.select("body")
          .append("div")
          .attr("class", "definitionlabel")  //for styling  label
          .attr("id", "deflabel")  //label for div
          .html(definitions[1]);  //add text
        })
        .on("mouseout", function(){
        d3.select(".definitionlabel")
        .remove();
         });

var fwbDefPanel = d3.select("#FW-B")
  .on("mouseover", function(){
          var infolabel = d3.select("body")
          .append("div")
          .attr("class", "definitionlabel")  //for styling  label
          .attr("id", "deflabel")  //label for div
          .html(definitions[2]);  //add text
        })
        .on("mouseout", function(){
        d3.select(".definitionlabel")
        .remove();
         });

var oDefPanel = d3.select("#O")
  .on("mouseover", function(){
          var infolabel = d3.select("body")
          .append("div")
          .attr("class", "definitionlabel")  //for styling  label
          .attr("id", "deflabel")  //label for div
          .html(definitions[3]);  //add text
        })
        .on("mouseout", function(){
        d3.select(".definitionlabel")
        .remove();
         });

function drawPcp(csvData, props){
  var colorScale = createColorScale(csvData);
  // console.log(colorScale);
   //pcp dimensions
  var width = 1125;
      height = 500;
  //create attribute names array for pcp axes
  var keys = [], attributes = [];
  //fill keys array with all property names
  for (var key in csvData[0]){
    keys.push(key);
  };
//console.log(keys);
  //fill attributes array with only the attribute names
  for (var i=1; i < keys.length-1;  i++){
    if (keys[i].indexOf("Rank")==-1){
      attributes.push(keys[i]);
    };

  };

// console.log(attributes);
  //create horizonatal pcp coordinate generator
  var coordinates = d3.scalePoint() // create an ordinal axis scale
    .domain(attributes) //horizontally space each axis evenly
    .range([0, width]); //set the horizontal width to svg
// console.log(width);
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
    var height = 350;
        width = 1175;
    var pcplot = d3.select("body")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "pcplot") //for styling
      .append("g") //append container elementa
      .attr("transform", //change the container size/shape-rendering
        "scale(0.8, 0.6) "+//shrink
        "translate(275, 50)"); //move
    var pcpBackground = pcplot.append("rect") //background for the pcpBackground
      .attr("x", "-30")
      .attr("y", "-35")
      .attr("width", "1180")
      .attr("height", "570")
      .attr("rx", "15")
      .attr("ry", "15")
      .attr("class", "pcpBackground");

    //add lines
    var pcpLines = pcplot.append("g")  //append a container element
      .attr("class", "pcpLines")  //class for styling lines
      .attr("x", 1115)
      .attr("y", 525);
    var pcpPathsg = pcpLines.selectAll("path")  //prepare for new path elements
      .data(csvData)  //bind data
      .enter() //create new path for each lines
      .append("g")
      .attr("id", function(d){
          return d.adm0_a3;  //id each line by admin code
      });

    var pcpPaths = pcpPathsg.append("path")  //append each line path to the container element
      .attr("d", function(d){
          return line(attributes.map(function(att){
              return [coordinates(att), scales[att] (d[att])];
          }));
      })
      .style("stroke", function(d) {  //color enumeration units
        // console.log(csvData);
          return choropleth(d, colorScale);
      })
      .on("mouseover", highlight)
      .on("mouseout", dehighlight)
      .on("mousemove", moveLabel);

      var desc = pcpPathsg.append("desc")
      .text(function(d){
        return '{"stroke": "'+choropleth(d, colorScale)+'", "stroke-width": "0.5px"}'
      })

    //add axes
    var axis = pcplot.selectAll(".attribute")  //prepare for new elements
      .data(attributes)  //bind data (attribute array)
      .enter()  //create new elements
      .append("g")  //append elements as containers
      .attr("class", function(d){
        return "axis " + d;
      })  //class for styling
      .attr("transform", function(d) {
          return "translate("+coordinates(d)+")";  //position axes
      })
      .each(function(d){  //invoke the function for each axis
          d3.select(this)  //select the current axis container element
              .call(axis.scale(scales[d])  //generate the scale
                  .ticks(0)  //no ticks
                  .tickSize(0)  //no ticks
              )
          .attr("id", d) //assign the attribute name as the axis id
          .style("stroke", "#fff")
          .style("stroke-width", "5px")  //style each axis
          .on("click", function(){  //click listener
                // sequence(this, csvData);
          });

      });

    //pcp axis labels
    var pcpTitleSPI = pcplot.append("text")
        .attr("x", -10)
        .attr("y", 525)
        //.transform(rotate("90deg"))
        .attr("class", "pcpTitle")
        .attr("id", "pcpTitleSPI")
        // adds title
        .text("SPI")
        .style("stroke", "#fff");


    var pcpTitleBHN = pcplot.append("text")
        .attr("x", 347)
        .attr("y", 525)
        .attr("class", "pcpTitle")
        .attr("id", "pcpTitleBHN")
        // adds title
        .text("BHN")
        .style("stroke", "#fff");


    var pcpTitleFWB = pcplot.append("text")
        .attr("x", 715)
        .attr("y", 525)
        .attr("class", "pcpTitle")
        .attr("id", "pcpTitleFWB")
        // adds title
        .text("FW-B")
        .style("stroke", "#fff");



    var pcpTitleO = pcplot.append("text")
        .attr("x", 1115)
        .attr("y", 525)
        .attr("class", "pcpTitle")
        .attr("id", "pcpTitleO")
        // adds title
        .text("O")
        .style("stroke", "#FFFFFF");
};

function setLabel(props){
  if (props.hasOwnProperty("name")) {
    countrylabel = props.name;
  }
  else {
    countrylabel = props.Country;
  }
  var attrValue = props[expressed];
  var rankValue = props[expressedRank];
  var resultString;
  var rankString;
  if (isNaN(attrValue)){
        resultString = "No Data" ;
        rankString = "Unranked";
    }else{
      resultString = attrValue.toString();
      rankString = rankValue.toString();
    }
  var labelAttribute = "<h1>"+resultString+"</h1><br><b>"+expressedName+"<br>"+countrylabel+"</b><br><b> Rank: "+rankString+"<br></b>";  //label content

  //create info label div
  var infolabel = d3.select("body")
      .append("div")
      .attr("class", "infolabel")  //for styling  label
      .attr("id", props.adm0_a3+"label")  //label for div
      .html(labelAttribute)  //add text
//console.log(props);
  var countrylabel;
//console.log(countrylabel);
  var countryName = infolabel
      .attr("div")
      .attr("class", "labelname")  //for styliing name
      .html(countrylabel);  //add feature name to label
};

function definitionLabel(String){
 var definitionAttribute = String;

 var infolabel = d3.select("#mySidenav")
      .append("div")
      .attr("class", "definitionlabel")  //for styling  label
      .attr("id", "deflabel")  //label for div
      .html(definitionAttribute);  //add text
};

function sequence(axis, csvData){
  //restyle the axis
  d3.selectAll(".axis")  //select every axis
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


function highlight(props){
    if (props.adm0_a3 < 1){
          return false;
    };
      //change stroke
      var selected = d3.selectAll("." + props.adm0_a3.replace(/ /g,"_"))
        .style("stroke", "#dbdc01")//stroke of highlight
        .style("stroke-width", "2");
        //setLabel(props)//calling setLabel and pass props to to allow the label to appear when highlight on the country
      d3.selectAll(".pcpLines")
          .select("#"+props.adm0_a3)
          .select("path")
          .style("stroke", "#dbdc01")
          .style("stroke-width", "7");

          setLabel(props)//calling setLabel and pass props to to allow the label to appear when highlight on the pcpline
};

function dehighlight(props){
  if (props.adm0_a3 < 1){
    return false;
  };
      var selected = d3.selectAll("." + props.adm0_a3)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
        d3.selectAll(".pcpLines")
            .select("#"+props.adm0_a3)
            .select("path")
            .style("stroke", function(d){
            var descText = d3.select(this.parentNode)
              .select("desc")
              .text();
              descText = JSON.parse(descText);//allows dehighlight to go back to original color
                return descText.stroke;
            })
            .style("stroke-width", "1");

        d3.select(".infolabel")
          .remove();
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
//function to move definition label with mouse
function moveDefLabel(){
        //get width of label
          var labelWidth = d3.select(".definitionlabel")
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

          d3.select(".definitionlabel")//moves label off the page so it doesnt flicker
              .style("left", x + "px")
              .style("top", y + "px");
};


})();
