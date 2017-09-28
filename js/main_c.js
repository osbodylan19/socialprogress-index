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
        //variables for data join
        var attrArray = ["Country","Social_Progress_Index","Rank_(BHN)","Basic_Human_Needs","Rank_(FW)",
        "Foundations_of_Well-Being","Rank_(O)","Opportunity"];
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

        //add countries to map
        var countries = map.selectAll(".countries")
            .data(worldCountries)
            .enter()
            .append("path")
            .attr("class", function(d){
              return "countries " + d.properties.adm0_a3;
            })
            .attr("d", path);
    };
};
