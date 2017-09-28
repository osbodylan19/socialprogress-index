(function(){
//pseudo-global variables
var attrArray = ["Social_Progress_Index","Basic_Human_Needs","Foundations_of_Well-Being","Opportunity"]; //list of attributes
var rankArray = ["Rank_(SPI)","Rank_(BHN)","Rank_(FW)","Rank_(O)"];
var expressed = attrArray[3]; //initial attribute
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

    //create Albers equal area conic projection centered on France
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
        //translate TopoJSON
        var worldCountries = topojson.feature(world, world.objects.collection).features;
       
        //join csv data to GeoJSON enumeration units
        worldCountries = joinData(worldCountries, csvData);    
        
        //create the color scale
        var colorScale = makeColorScale(csvData);
        
        setEnumerationUnits(worldCountries, map, path, colorScale);
    };

};
function joinData(worldCountries, csvData){
    //...DATA JOIN LOOPS FROM EXAMPLE 1.1
console.log(csvData);
        //variables for data join
        var attrArray = ["Country", "Rank_(SPI)", "Social_Progress_Index", "Rank_(BHN)", "Basic_Human_Needs", "Rank_(FW)", "Foundations_of_Well-Being", "Rank_(O)", "Opportunity"];

        //loop through csv to assign each set of csv attribute values to country
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.adm0_a3; //the CSV primary key

            //loop through geojson countries to find correct country
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
    //...REGIONS BLOCK FROM MODULE 8
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
        });
};

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043",
        "#65002d"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
    
        var val = parseFloat(data[i][expressed]);
        
        domainArray.push(val);
    
    };

    
    //assign array of expressed values as scale domain
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
})();
