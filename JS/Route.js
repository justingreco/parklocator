//function for configuring the route betwwen two points

function ConfigureRoute(mapPoint) {
    ShowLoadingMessage("Loading...");
    ShowDojoLoading(dojo.byId('scrollbar_container2'));
    routeParams.stops.features = [];
    routeParams.stops.features[0] = new esri.Graphic(mapPoint, null);
	
	if (pollName != ''){
		var query = new esri.tasks.Query();
		var queryTask = new esri.tasks.QueryTask('http://maps.raleighnc.gov/ArcGIS/rest/services/Parks/ParkLocator/MapServer/1');	
		query.where = "NAME = '"+pollName+"'";
		query.returnGeometry = true;
		queryTask.execute(query, function(result){
			if (result.features.length == 0){
			    routeParams.stops.features[1] = new esri.Graphic(pollPoint, null);
				if (routeParams.stops.features.length === 2) {
					routeTask.solve(routeParams);
				}
			}
			else if (result.features.length > 1){
			    //routeParams.stops.features[1] = new esri.Graphic(result.features[0].geometry, null);
				//if (routeParams.stops.features.length === 2) {
				//	routeTask.solve(routeParams);
				//}
				FindClosestFacility(mapPoint, result.features);
			}
			else if (result.features.length == 1)
			{
				routeParams.stops.features[1] = new esri.Graphic(result.features[0].geometry, null);
				if (routeParams.stops.features.length === 2) {
					routeTask.solve(routeParams);
				}			
			}
			//If both the "to" and the "from" addresses are set, solve the route

		});
	}
	else{
		routeParams.stops.features[1] = new esri.Graphic(pollPoint, null);
		   //If both the "to" and the "from" addresses are set, solve the route
		if (routeParams.stops.features.length === 2) {
			routeTask.solve(routeParams);
		}
	}

	
	

}

function FindClosestFacility(from, toGraphics){
	params = new esri.tasks.ClosestFacilityParameters();
	params.defaultCutoff = 50.0;
	params.returnIncidents = false;
	params.returnRoutes = true;
	params.returnDirections = false;
	params.defaultTargetFacilityCount = 1;
	params.directionsTimeAttribute = "";
	var features = [];
	features.push(new esri.Graphic(from));
	var incidents = new esri.tasks.FeatureSet();
	incidents.features = features;
	params.incidents = incidents;
	features = [];
	for (var i=0;i<toGraphics.length;i++){
		features.push(new esri.Graphic(toGraphics[i].geometry,null));
	}
	var facilities = new esri.tasks.FeatureSet();
	facilities.features = features;
	params.facilities = facilities;
	var closestFacilityTask = new esri.tasks.ClosestFacilityTask("http://maps.raleighnc.gov/ArcGIS/rest/services/Networks/WakeNetwork/NAServer/Closest%20Facility");
	closestFacilityTask.solve(params, function(solveResult){
			    routeParams.stops.features[1] = new esri.Graphic(toGraphics[solveResult.routes[0].attributes['FacilityID']-1].geometry,null);
				if (routeParams.stops.features.length === 2) {
					routeTask.solve(routeParams);
				}
		}, function(fault){
			var tst = "";
	});
}

var pollRoute;
var routeText = " ";
//function for displaying the route between two points
function ShowRoute(solveResult) {
	
    map.graphics.clear(routeSymbol);
    var directions = solveResult.routeResults[0].directions;
	pollRoute = directions.mergedGeometry;
    //Add route to the map
    map.graphics.add(new esri.Graphic(directions.mergedGeometry, routeSymbol));
    //if (!layer) {
        map.setExtent(directions.mergedGeometry.getExtent().expand(3));
    //}
    //Display the total time and distance of the route
    dojo.byId("tdParkDirections").innerHTML = "Total distance: " + FormatDistance(directions.totalLength, "mile(s)") + "<br />Total time: " + FormatTime(directions.totalTime);
	routeText = dojo.byId("tdParkDirections").innerHTML.replace('<br>',';');
    if (!layer) {
        dojo.byId('directionContainer').style.display = 'block';
    }
    var tableDir;
    var tBodyDir;
    if (!dojo.byId('tblDir')) {
        tableDir = document.createElement('table');
        tBodyDir = document.createElement('tbody');
        tableDir.id = 'tblDir';
        tableDir.style.width = "95%";
        tBodyDir.id = 'tBodyDir';
        tableDir.cellSpacing = 0;
        tableDir.cellPadding = 0;
        tableDir.appendChild(tBodyDir);
    }
    else {
        tableDir = dojo.byId('tblDir');
        tBodyDir = dojo.byId('tBodyDir');
    }

    dojo.forEach(solveResult.routeResults[0].directions.features, function (feature, i) {
        var miles = FormatDistance(feature.attributes.length, "miles");
        var trDir = document.createElement('tr');
        trDir.style.verticalAlign = 'top';
        tBodyDir.appendChild(trDir);
        var tdDirNum = document.createElement('td');
        tdDirNum.innerHTML = (i + 1) + ". &nbsp";
        trDir.appendChild(tdDirNum);
        var tdDirVal = document.createElement('td');
        tdDirVal.style.paddingBottom = '5px';
        if (i == 0) {
            tdDirVal.innerHTML = feature.attributes.text.replace('Location 1', map.getLayer(tempGraphicsLayerId).graphics[0].attributes.Address);
        }
        else if (i == (solveResult.routeResults[0].directions.features.length - 1)) {
            tdDirVal.innerHTML = feature.attributes.text.replace('Location 2', dojo.byId('leftInfoWindowHeader').innerHTML);                    
        }
        else {
            if (miles) {
                tdDirVal.innerHTML = feature.attributes.text + " (" + FormatDistance(feature.attributes.length, "miles") + ")";
            }
            else {
                tdDirVal.innerHTML = feature.attributes.text;
            }
        }
		routeText+= ';<BOL>'+(i+1)+".</BOL> "+tdDirVal.innerHTML;
        trDir.appendChild(tdDirVal);
    });
    dojo.byId("direction").appendChild(tableDir);
    CreateScrollbar(dojo.byId('directionContainer'), dojo.byId('direction'));
	if(ismobile){
		dojo.style('direction','overflow','auto');}
    HideDojoLoading();
    HideLoadingMessage();
}

//Display any errors that were caught when attempting to solve the rotue
function ErrorHandler(err) {
    dojo.byId('divLoadMessage').innerHTML = err.message + "\n" + err.details.join("\n");
    dijit.byId('dialogLoadMessage').titleNode.innerHTML = 'Error';
    dijit.byId('dialogLoadMessage').show();
    HideDojoLoading();
    HideLoadingMessage();
    if (!layer) {
        dojo.byId('tdParkDirections').innerHTML = '';
        dojo.byId('directionContainer').style.display = 'none';
        map.graphics.clear();
        map.getLayer(tempGraphicsLayerId).clear();
        mapPoint = '';
    }
    if (dijit.byId('btnCurrentLocation')) {
        if (dijit.byId('btnCurrentLocation').checked) {
            dijit.byId('btnCurrentLocation').setAttribute('checked', false);
            dojo.byId('txtDAddress').disabled = false;
            dojo.byId('txtDAddress').title = 'Enter an address to locate';
            dojo.byId('directionSearch').style.cursor = 'pointer';
            dojo.byId('directionSearch').title = "Search";
        }
    }
}

//Format the time as hours and minutes
function FormatTime(time) {
    var hr = Math.floor(time / 60), //Important to use math.floor with hours
            min = Math.round(time % 60);

    if (hr < 1 && min < 1) {
        return "";
    }
    else if (hr < 1) {
        return min + " minute(s)";
    }

    return hr + " hour(s) " + min + " minute(s)";
}

//Round the distance to the nearest hundredth of a unit
function FormatDistance(dist, units) {
    var d = Math.round(dist * 100) / 100;
    if (d === 0) {
        return "";
    }

    return d + " " + units;
}