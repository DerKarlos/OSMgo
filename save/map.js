//////////////////////////////////////////////////////////////// Store URL parameter in array
var HTTP_GET_VARS=new Array();  // HTTP-Parameter sind viele Name=Wert Paare. Das "Array" hat keine Nummern-Index sondern verwendet den Namen! Genial.

///////////// Store URL parameter in array
var HTTP_GET_VARS=new Array();  // HTTP-Parameter sind viele Name=Wert Paare. Das "Array" hat keine Nummern-Index sondern verwendet den Namen! Genial.
var strGET = document.location.search.substr(1,Math.min(document.location.search.length,500)) // No unlimited string
if( strGET!='')
{
  gArr = strGET.split('&');
  for (i in gArr)                   // Alle HTTP-Parameter
  { v=''; vArr=gArr[i].split('=');  // In Name und Wert teilen
    if(vArr.length>1){v=vArr[1];}   // Wert vorhanden? Merken.
    HTTP_GET_VARS[unescape(vArr[0])] = unescape(v);  // Wert mit Index=Namen in Array.
  }
}

//// Name suchen und Wert zurückgeben
function GET_ParD(v,d) {
  if(   !HTTP_GET_VARS[v]){return d}    // Name als Index nicht vorhanden? return Defaultwert
  return HTTP_GET_VARS[v];              // ansonsen return Wert zum Namen
}




///// Leaflet ////////////////////////////////////////////////////////////////

var map
var ignoreNextGo = false

var fly  = 4
var opt  = 2
var tiles= 4
var sha  = false
var card = false
var filt = ""
var user = "user"

var ele  = 555
var view = 0
var dir  = -10

/// Parameter in Eingabefelder schreiben
var con
    if(con = GET_ParD("con",0)) switch(con*1) {
		case 1:  document.getElementById('c1').checked = true ;break
		case 2:  document.getElementById('c2').checked = true ;break
		case 3:  document.getElementById('c3').checked = true ;break
		default: document.getElementById('c3').checked = true ;break
    }

if(document.getElementById('fly')) {
	if(fly   = GET_ParD("fly",  4)) document.getElementById('fly'  ).value   = fly
	if(opt   = GET_ParD("opt",  2)) document.getElementById('opt'  ).value   = opt
	if(tiles = GET_ParD("tiles",0)) document.getElementById('tiles').value   = tiles
	if(sha   = GET_ParD("sha",  0)) document.getElementById('sha'  ).checked = true
	if(card  = GET_ParD("card", 0)) document.getElementById('card' ).checked = true
	if(filt  = GET_ParD("f",    0)) document.getElementById('f'    ).value   = filt
	if(user  = GET_ParD("user", 0)) document.getElementById('user' ).value   = user

	if(ele   = GET_ParD("ele", 555)) document.getElementById('ele'  ).value   = ele *1
	if(ele   = GET_ParD("dir",   0)) document.getElementById('dir'  ).value   = dir *1
	if(ele   = GET_ParD("view",-10)) document.getElementById('view' ).value   = view*1
}
	


function load_map() {

	var osmUrl  = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
	var osmAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
	
	var	mbUrl   = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
	var mbAttr  = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			                      '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			                      'Imagery © <a href="http://mapbox.com">Mapbox</a>'

	    osmdef    = L.tileLayer(osmUrl, {maxZoom: 18,		 	attribution: osmAttr});
    var	mapbox    = L.tileLayer( mbUrl, {id: 'mapbox.streets',  attribution:  mbAttr});
//	var grayscale = L.tileLayer( mbUrl, {id: 'mapbox.light',    attribution:  mbAttr});

	var latitude  = GET_ParD("lat",30.0001) * 1
	var longitude = GET_ParD("lon", 0) * 1
	var zoom0 = 13 ;if(latitude == 30.0001) zoom0 = 3

//	var
	    layers   = [osmdef,   cities]
	if(GET_ParD('go',true)) layers.push(visits,notes)
	    userName = GET_ParD('user',undefined)
	if( userName && userName!="" ) {
		defLayer =  osmdef
		layers   = [osmdef, visits, notes]  // users, 
		if(userName=="karlos") layers   = [osmdef,visits]
	} else
		userName = 'user'

	    opac = 0.0	;if( userName=="karlos" ) opac = 0.4


	map = L.map('map', {
		center: [latitude, longitude],
		zoom:    zoom0,
		zoomControl: true,
		layers: layers
	});

	var baseLayers = {
		"OSM":       osmdef,
		"MapBox":    mapbox,
	};

	var overlays = {
		"Cities": cities,
		"Notes":  notes,
		"OSM go": users,
		"Visits": visits,
		"You":    you
	};


	L.control.layers(baseLayers, overlays).addTo(map)



	////??? Locaton: nicht sauber coded

	L.Control.Location = L.Control.extend({
	    onAdd: function(map) {
	        var img = L.DomUtil.create('img');
	        img.src = 'images/navigation.png';
	        img.style.width = '30px';
	        return img;
	    },
	
	    onRemove: function(map) {
	        // Nothing to do here
	    }
	});
	
	L.control.Location = function(opts) { return new L.Control.Location(opts) }
	L.control.Location( {position:'topleft'} ).addTo(map)


//	map.on('keypress',		keypress 		)
	map.on('click',			mapclick		)
	map.on('dblclick',		mapdblclick 	)
	map.on('contextmenu',   contextmenu		)
	map.on('locationfound', onLocationFound	)
	map.on('mousedown',     pointdown       )
	map.on('mousemove',     pointmove       )
	map.on('mouseup',       pointup         )
	map.on('touchstart',    pointdown       )
	map.on('touchend',      pointup         )




//	map.on('popupclose',	alert("PopDown"))
	
	addPlaces()
//	info.update(layer.feature.properties)
    update(100)

	if(GET_ParD("map",0)*1>0) pos_set()
		
	// Das macht Leaflet sicher selbst/anders:  document.getElementById("myP").style.cursor = "crosshair" 

	if(zoom0 == 13) {
		var loc = '<a href="javascript:doCenterPlace(0,'+latitude+','+longitude+');"><img src="images/navigation.png" width="20" alt="zoom"/></a>'
		var men = placeMenu(latitude,longitude, ele,16,dir,view,tiles)
		addYou(             latitude,longitude, ele,14,dir,view,tiles,"Pos:",userName ).setIcon(locationIcon)
		map.addLayer(you)
		popup = L.popup() // ToDo: popup-Instanzen wieder löschen
				 .setLatLng([latitude,longitude])
				 .setContent("You:"+userName +"<br>"+ loc+men)
				 .openOn(map)
	}//äää


} //--- END INIT/load_map -----

window.onload = load_map

///// SEARCH ////////////////////////////////////////////////////////////////

var feature // Rechteck markiert gefundenen und ausgewählten Ort

function chooseAddr(lat1, lng1, lat2, lng2, osm_type) {
	var loc1 = new L.LatLng(lat1, lng1);
	var loc2 = new L.LatLng(lat2, lng2);
	var bounds = new L.LatLngBounds(loc1, loc2);

	if (feature) {
		map.removeLayer(feature);
	}
	if (osm_type == "node") {
		feature = L.circle( loc1, 25, {color: 'green', fill: false}).addTo(map);
		map.fitBounds(bounds);
		map.setZoom(18);
	} else {
		var loc3 = new L.LatLng(lat1, lng2);
		var loc4 = new L.LatLng(lat2, lng1);

		feature = L.polyline( [loc1, loc4, loc2, loc3, loc1], {color: 'red'}).addTo(map);
		map.fitBounds(bounds);
	}
}

function addr_search() {
    var inp = document.getElementById("addr");

    $.getJSON('http://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + inp.value, function(data) {
        var items = [];

        $.each(data, function(key, val) {
            bb = val.boundingbox;
            items.push("<li><a href='#' onclick='chooseAddr(" + bb[0] + ", " + bb[2] + ", " + bb[1] + ", " + bb[3]  + ", \"" + val.osm_type + "\");return false;'>" + val.display_name + '</a></li>');
        });

		$('#results').empty();
        if (items.length != 0) {
            $('<p>', { html: "Search results:" }).appendTo('#results');
            $('<ul/>', {
                'class': 'my-new-list',
                html: items.join('')
            }).appendTo('#results');
        } else {
            $('<p>', { html: "No results found" }).appendTo('#results');
        }
    });
}


///// GO-MAP ////////////////////////////////////////////////////////////////


var cities = new L.LayerGroup()
var users  = new L.LayerGroup()
var you    = new L.LayerGroup()
var visits = new L.LayerGroup()
var notes  = new L.LayerGroup()

var userName
var userIP
var userPos = "user"
var logs    = 100
var userName

var popup = undefined

var places  = []
var ipDone  = false

var si = 24
var an = 12
var pa =  0

var   placesIcon = L.icon({
    iconUrl: 'icon-place.png',
    iconSize:    [si, si],
    iconAnchor:  [an, an],
    popupAnchor: [pa, pa]
})             
var     userIcon = L.icon({
    iconUrl: 'icon-user.png',
    iconSize:    [si, si],
    iconAnchor:  [an, an],
    popupAnchor: [pa, pa] 
})             
var   activIcon  = L.icon({
    iconUrl: 'icon-activ.png',
    iconSize:    [si*1.5, si*1.5],
    iconAnchor:  [an, an],
    popupAnchor: [pa, pa]
})
var locationIcon = L.icon({
    iconUrl: 'icon_location.png',
    iconSize:    [si, si],
    iconAnchor:  [an, an],
    popupAnchor: [pa, pa]
})
var       ipIcon = L.icon({
    iconUrl: 'ip_location.jpg',
    iconSize:    [si, si],
    iconAnchor:  [an, an],
    popupAnchor: [pa, pa]
})



function placeMenu(lat,lon,ele,zoom,dir,view,tiles) {

	// TODO: Bei F4/ob sind LatLon der Viewpunkt, bei go die Kamera. Also: Winkel-umrechnung

	//        http://www.openstreetmap.org/?lat=48.5696&lon=13.4384&zoom=14&layers=M
	var osm = "http://www.openstreetmap.org/?"
		+ "lat="  +lat
		+"&lon="  +lon
		+"&zoom=" +zoom
		+"&layers=M"

	//        http://www.openstreetmap.org/edit?editor=id#map=20/53.50188/7.09313
	var id = "http://www.openstreetmap.org/edit?editor=id#map="
		       +zoom
		+ "/"  +lat
		+ "/"  +lon

	//        http://maps.osm2world.org/?zoom=17&lat=48.57259&lon=13.45641
	var ow = "http://maps.osm2world.org/?"
		+ "lat="  +lat
		+"&lon="  +lon
		+"&zoom=" + (Math.min(zoom,17))

	var ob = "http://osmbuildings.org/?"
		+ "lat="  +lat
		+"&lon="  +lon
		+"&tilt="
	ob += -(view*1) // &tilt=30
	ob +="&zoom=" +zoom

	var f4 = "http://demo.f4map.com/?"
		+ "lat="  +lat
		+"&lon="  +lon
		+"&camera.theta="
	f4 += -(view*1) // +"&camera.theta=50"
		+"&camera.phi=88.522"
		+"&zoom=" + (Math.max(zoom,16))

	//        http://opensciencemap.org/s3db/#scale=16&rot=0&tilt=50&lat=48.5696&lon=13.4384
	var os = "http://opensciencemap.org/s3db/#"
		+ "lat="  +lat
		+"&lon="  +lon
		+"&scale="+zoom
		+"&tilt=" +(view*-1)
		+"&rot="  +dir 

	var go = 
		  "http://osmgo.org/?"
		+ "lat="  + (lat*1 - ele/111111)
		+"&lon="  +lon
		+"&dir="  +dir 
		+"&view=" +view
		+"&ele="  +ele
	//	+"&tiles="+tiles
	//	+"&user=" +userName

	var vr = 
		  "http://osm4vr.eu/dev/?"           // http://osm4vr.eu/dev/?param=yes#47.697317/-1.938388/65830/18/-55
		+ "#"     + (lat*1 - ele/111111)
		+ "/"     +lon
		+ "/"     +ele
		+ "/"     +dir 
		+ "/"     +view

	var xx = 
		  "http://misc.blicky.net/map3d/?"	// http://misc.blicky.net/map3d/?q=one%20world%20trade%20center,%20new%20york%20city&zoom=17&size=4
			  								// http://misc.blicky.net/map3d/?c=40.699321,%20-74.171863&size=4
											// 		https://forum.openstreetmap.org/viewtopic.php?pid=671279#p671279
	//	+ "q=Passau"
		+ "&c="   + (lat*1 - ele/111111)
		+ ",%20"  +lon
		+ "&size=4"
		+ "&zoom="+zoom


	if(GET_ParD('go',true)) {
		var  ret = ''  // if GO
		+' <a href="javascript:aBlank(\''+osm+'\','+lat+','+lon+')"><img src="rdr_osm.png"  width="20"  alt="OpenStreetMap"  title="OpenStreetMap"  /></a>'
		+' <a href="javascript:aBlank(\''+id +'\') "><img src="rdr_id.png"   width="20"  alt="OSM ID-Editor" title="OSM ID-Editor"  /></a>'
		+' <a href="javascript:aBlank(\''+vr +'\') "><img src="rdr_vr.png"   width="20"  alt="OSM 4 VR"      title="OSM 4 VR"       /></a>'
		+' <a href="javascript:aBlank(\''+xx +'\') "><img src="rdr_xx.png"   width="20"  alt="OSM 4 XX"      title="OSM 4 XX"       /></a><br>'
		+                                    ' View in 3D:&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp<br>'
		+' <a href="javascript:aSelf( \''+go +'\')"><img src="rdr_go.png"   hspace=4    alt="OSM go"         title="OSM go"         style="float:left;width:44px;height:44px;" /></a>'
		+' <a href="javascript:aBlank(\''+ob +'\')"><img src="rdr_osmb.png" width="20"  alt="OSMBuildings"   title="OSMBuildings"   /></a>'
		+' <a href="javascript:aBlank(\''+ow +'\')"><img src="rdr_o2w.png"  width="20"  alt="OSM2WORLD"      title="OSM2WORLD"      /></a><br>'
		+' <a href="javascript:aBlank(\''+os +'\')"><img src="rdr_sm.png"   width="20"  alt="OpenScienceMap" title="OpenScienceMap" /></a>'
		+' <a href="javascript:aBlank(\''+f4 +'\')"><img src="rdr_f4.png"   width="20"  alt="F4 Map"         title="F4 Map"         /></a>'
	   } else {
		var ret = ''  // if MAP
		+' <a href="javascript:aBlank(\''+osm+'\')"><img src="rdr_osm.png"  width="20"  alt="OpenStreetMap" /></a>'
		+' <a href="javascript:aBlank(\''+id +'\')"><img src="rdr_id.png"   width="20"  alt="OSM ID-Editor" /></a>'
		+' <a href="javascript:aBlank(\''+ow +'\')"><img src="rdr_o2w.png"  width="20"  alt="OSM2WORLD"     /></a>'
		+' <a href="javascript:aBlank(\''+ob +'\')"><img src="rdr_osmb.png" width="20"  alt="OSMBuildings"  /></a>'
		+' <a href="javascript:aBlank(\''+f4 +'\')"><img src="rdr_f4.png"   width="20"  alt="F4 Map"        /></a>'
		+' <a href="javascript:aBlank(\''+os +'\')"><img src="rdr_sm.png"   width="20"  alt="OpenScienceMap"/></a>'
		+' <a href="javascript:aSelf( \''+go +'\')"><img src="rdr_go.png"   width="20"  alt="OSM go"        /></a>'
	}

	


	return ret
}


function aBlank(url,lat,lng,name) {
	map.closePopup()
	window.open(url,'_blank')
	doCenterPlace(0,lat,lng)
}

function aSelf(url,lat,lng,name) {
	map.closePopup()
	//if(url.substring(0,16) == "http://osmgo.org")  
	ignoreNextGo = true
	if(document.getElementById('fly')) {
		if(document.getElementById('user' ).value=="") {
			var response = prompt("Doctor Who?")
		}
		var con = 1
		if(document.getElementById('c2').checked) con = 2
		if(document.getElementById('c3').checked) con = 3
		url = url
		+"&tiles=" + document.getElementById('tiles').value
		+"&user="  + document.getElementById('user' ).value // userName
		+"&opt="   + document.getElementById('opt'  ).value
		+"&con="   + con
		+"&fly="   + document.getElementById('fly'  ).value
		+"&sha="   + document.getElementById('sha'  ).checked
		+"&card="  + document.getElementById('card' ).checked
	} else {
		url = url
	//	+"&tiles="+tiles
		+"&user=" +userName
	}


	window.open(url,'_self')
	doCenterPlace(0,lat,lng)
}

function addPlace(       lat,lon,ele,zoom,dir,view,tiles,nam) {
	var p = L.circleMarker([lat, lon], {color:'blue', radius:6, title:nam}).on('click',contextmenu).addTo(cities) //p.name = nam	
//	var p = L.marker(      [lat, lon], {icon: placesIcon,        title:nam}).on('click',contextmenu).addTo(cities)
		p.ele   = ele
		p.zoom  = zoom
		p.dir   = dir
		p.view  = view	
		p.tiles = tiles
		p.name  = nam
		p.type  = ""
	places.push(p)
	return p
}

function addYou(         lat,lon,ele,zoom,dir,view,tiles,what,where) {
	var p = L.marker([lat, lon], {icon: placesIcon, title:what+" "+where}).on('click',contextmenu).addTo(you)
	p.name = what+"<br>"+where
	p.type = "You! "
	places.push(p)
	
	return p
}


function addPlaces() {

	//		  lat,      lon       ele zo dir vie ti name
	addPlace( 48.56963,  13.45554,413,16,356,-51,5,"Passau"  )
	addPlace( 47.06283,  15.47047,555,17,  0,-45,4,"Graz")
	addPlace( 47.06969,  15.45582,555,18,  0,-45,4,"Graz")
	addPlace( 54.07598,  12.11363,555,17,  0,-45,4,"Rostock")
	addPlace( 51.40109,   7.48332,555,16,  0,-45,4,"Hagen")
//	addPlace( 48.95678,   8.45186,333,16,  0,-45,4,"Karlsruhe")
	addPlace( 49.01160,   8.41699,333,16,  0,-45,4,"Karlsruhe")
	addPlace( 48.95531,   8.45190,555,16,  0,-45,4,"Scai's Tower")	
//	addPlace( 51.40109,   8.41699,555,16,  0,-45,4,"Scai's Tower")
	addPlace( 51.74405,  11.96233,555,18,  0,-45,4,"Köthen")
	addPlace( 51.75048,  11.94586,555,18,  0,-53,4,"Köthen")
	addPlace( 50.26803,  10.96467,216,18,  1,-38,4,"Coburg")
	addPlace( 36.10068,-115.17207,777,16,  1,-51,5,"LasVegas")
	addPlace( 51.51601,  -0.12803,620,16,  0,-59,4,"London"  )
	addPlace( 40.75203, -73.98150,881,16,  0,-76,4,"NewYork" )
	addPlace( 33.44874,-112.07591,555,16,  0,-45,4,"Phoenix")
	addPlace( 43.04896, -76.15016,555,16,  0,-50,4,"Syracuse")
	addPlace( 51.34000,  12.38025,555,16,  0,-45,4,"Leibzig")
	addPlace( 53.07544,   8.80853,555,18,  0,-45,4,"Bremen")
	addPlace( 53.62431,  11.41649,555,17,  0,-45,4,"Schwerin")
	addPlace( 41.87870, -87.62837,555,17,  0,-45,4,"Chicago")
	addPlace( 60.16996,  24.93242,333,17,  0,-45,4,"Helsinki")
	addPlace( 52.22977,  21.01178,333,15,  0,-45,4,"Warszawa")
	addPlace( 50.06067,  19.93756,555,18,  0,-45,4,"Kraków")
	addPlace( 55.75252,  37.62287,150,19,  0,-50,3,"Moscow Бремен"  )	
  //addPlace(  7.72425,  81.69345,333,19,  0,-45,4,"Batticaloa")  // no special 3D Places
	addPlace( 52.03483,   4.31974,555,16,  0,-45,4,"Rijswijk")
	addPlace(  1.29419, 103.85710,75, 18,133, -6,5,"Singapore")
	addPlace( 48.85832,   2.29455,333,18, 50,-45,4,"Paris")
	addPlace( 52.51792,  13.39907, 30,18,300, +4,4,"Berlin")
	addPlace( 37.80500,-122.40700,145,16,203,-19,8,"San Francisco")
	addPlace( 31.23518, 121.49458,999,16,279,-73,4,"Shanghai 上海市")
	addPlace( 27.16932,  78.04045,127,16,345,-19,5,"Taj Mahal ताज महल")
	addPlace( 29.97924,  31.13837, 27,18,102,  1,5,"Great Pyramid of Giza")
	addPlace(-23.53625, -46.64121,814,14,180,-52,4,"São Paulo")
	addPlace( 22.30196,114.190537,100,18,  0,-10,3,"Hong Kong 洪洞县")
//http://olat=22.30195997142941&lon=114.19053733348848&dir=0&view=-10&ele=101&tiles=3&user=

	//		  lat,      lon       ele zo dir vie ti name
}

var avatars = []
var init    = true

var activCount = 0


function Chat_IP(vals) {
	if(!ipDone) {
		ipDone = true
		//console.log("io:",vals[4])
		userIP  = vals[4]

		xmlhttp = new XMLHttpRequest()
		xmlhttp.onreadystatechange = function() {

			if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)) {
				ipData = jQuery.parseJSON( xmlhttp.responseText )	// Antworttext auswerten in Javascriptvariablen
				//console.log(ipData)
				if(ipData.regionName)   userPos  =      ipData.regionName
				if(ipData.city)         userPos  =      ipData.city
			//	if(userName=="user")   {userName = userPos ;console.log("userName:",userName)} // Default user? Name = region or city
				if(ipData.country){userPos  = userPos+"/"+ipData.country//_name
					if(userName=="user") {
						userName = ipData.country
						if(userName=="Germany" && ipData.city!="") userName += ("_"+ipData.city)
						console.log("userName:",userName)
					} // Default user? Name = region or city
									   }
				//console.log("eigene IP-Position:",userPos)
			}

		}
		xmlhttp.onprogress= function(evt) {;}
		xmlhttp.open("GET", "http://freegeoip.net/json/"+userIP, true);
	//	xmlhttp.open("GET", "http://ip-api.com/json/"   +userIP, true);
		xmlhttp.send();			

	}
}

function AvatarsCreate(xchg,init) { //                                    0:ID  1:date_time   2:? 3:lat=x 4:lon=-z 5:ele=y 6:ay 7:ax? 8:v   9:secs 10:name
	// pos|1;2017-03-26 09:04:53;1;1.000;2.000;3.000;4.0;5.0;6.000;0;name|2;2017-03-26 09:01:58;1;49.7150;11.08700;10.0000;0.00;-10.0;0.000;175;name|
	var list = xchg.split("|")
        activCount = 0

	for(u in list) {
		if( list[u].length < 20 ) continue
		var vals  = list[u].split(";")
		var id    = vals[0]*1
			
		if( id ==0) { Chat_IP(vals) ;continue}

		//r dat   = vals[1]
		var activ = vals[2]*1
		var lat   = vals[3]*1
		var lon   = vals[4]*1
		var ele   = vals[5]*1
		var dir   = vals[6]*1
		var view  = vals[7]*1
		var age   = vals[9]*1
		var nam_  = vals[10]

		var a = avatars[id] // oder in users.target nach dier userID suchen

		if(a===undefined) {  // if(init)
			// if(avatars.length<55) console.log(list[u])
			var i = userIcon ;if(activ) { i=activIcon ;activCount++ }
			var a = L.circleMarker([lat, lon], {color:'green', radius:5, title: "User: "+nam_}).on('click',contextmenu).addTo(users) ;a.name = nam_	
		//	var a = L.marker(      [lat, lon], {icon: i,                 title: "User: "+nam_}).on('click',contextmenu).addTo(users)
		//	if(!activ) a.setOpacity(opac)

			a.age   = age
			a.activ = 0 // nein, Flanke soll erkannt werden!   activ
			a.ele   = ele
			a.dir   = dir
			a.view  = view
			a.name  = nam_
			a.type  = "USER: "
			avatars[id] = a
		} else { // update
			// var a = avatars[id] // oder in users.target nach dier userID suchen
			if(!a) {
				alert("Missing a for id "+id)
				continue
			}
			if(activ) {
				var f = 15
				var opac = (f-age)/f ;if(opac<(1/3)) opac=(1/3)  //   0s=1 40s = 0  Timeout ist 30
			//	a.setOpacity(opac)  //   0s=1 60s = 0
				a.setRadius(opac*6)
				a.ele = ele
				a.setLatLng(L.latLng(lat,lon))
				activCount++
			}
			// console.log("update:",id,a.age,age,activ)
			if( a.activ != activ ) {
				a.activ  = activ
				// show level
				map.addLayer(users)  // Users sichtbar machen
				var as = "gone"
				if(activ) {
					as = "present"
					layers.push(osmdef) // ???
					doCenterAvatar(id,16)
					a.setRadius(12)
				//	a.setIcon(activIcon)	//	a.setZIndexOffset(a._zIndex+100)
				//	a.setOpacity(1.0)
				}
				else {
					if(!a)
						console.log("mist a")
					a.setRadius(5)
					//a.setIcon(userIcon)
					//a.setOpacity(opac)
					if(nam_!="karlos") {
					    var xmlhttp = new XMLHttpRequest() // !! httpS, damit Chrome nicht blockiert wegen cross-access oder so
					    xmlhttp.open("GET", "https://zi11.ddns.net:3487/web/message?type=3&timeout=3&text="+a.name+" is' wech", true)
					    xmlhttp.send()
					}
				}
				if(avatars.length<55) console.log(list[u])
			//	if(nam_!="karlos")
				if(ignoreNextGo)	ignoreNextGo = false
				else				console.log('OSM-go user "'+nam_+'"\nis '+as+'.',"test")  // alert prompt confirm
	
				    // Active				    window.addEventListener('focus', startTimer);
				// Inactive				    window.addEventListener('blur', stopTimer);
			}//gone/activ

		}//update
	}//all users
	//console.log("ZWEI:",list[3])
	return activCount
}//AvatarsCreate


//// Hilfsfunktionen für Marker

function doCenterPlace(i,lat,lon) {
	if(map._zoom>=14) {
		// map.setView([30,0], 2)
		return
	}
	if(lat) {
		var ll =  new L.LatLng(lat,lon)
	} else
		var ll = places[i]._latlng
	console.log("centerP",i,ll)
	map.setView(ll, 14, {animate:true})
}

function doCenterAvatar(id,zoom) {
	if(map._zoom>=14) {
		// map.setView([30,0], 2)
		return
	}
	if(!zoom) zoom = 14
	var ll = avatars[id]._latlng
	map.setView(ll, zoom)//, {animate:true})
}


function pos_set() {
	map.addLayer(you)  // You sichtbar machen
	map.locate( { setView: true, maxZoom: 16 } )
}


function onLocationFound(e) {
	addYou(ipData.lat,ipData.lon, 555,14,140,-45,4,userPos,userIP  ).setIcon(ipIcon)
    var radius = e.accuracy / 2
	var lat = e.latlng.lat
	var lng = e.latlng.lng ;if(lng>+180) lng -= 360 ;if(lng<-180) lng += 360
	var a = addYou(lat,lng, 101,16,0,-45,4,  "Browser-Location:",lat.toFixed(8)  +'° / '+ lng.toFixed(8)  )
		a.setIcon(locationIcon)
		if(GET_ParD("gps",0)*1>0) {
			// contextmenu(e)
  			var ll  = e.latlng
  			var lng = ll.lng*1 ;if(lng>+180) lng -= 360 ;if(lng<-180) lng += 360
    		var go = "http://osmgo.org/?lat="+(ll.lat*1)+"&lon="+lng+"&view=-10&ele=101&user="+userName
			window.open(go,"_self")
		}



}



/*** /
//// Chat-Anzeige
var info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info') // create a div with a class "info"
    this.update("updateAdd")
    return this._div
}

// method that we will use to update the control based on feature properties passed
info.update = function (text) {
   this._div.innerHTML = text
}

//info.addTo(map)
/***/

//// Main-Zyklus: Austausch mit Server und danach x ms warten
function update(init) {

	if(init) {

		//// Left notes
	    var
		xmlhttpN = new XMLHttpRequest()
	    xmlhttpN.onreadystatechange = function() {
	        if ((xmlhttpN.readyState == 4) && (xmlhttpN.status == 200)) {
				var vs = xmlhttpN.response.split("<br>")
			    for (v in vs) {
					if(vs[v].length<9) continue
					// console.log("Note:",vs[v])
			    	var vi = vs[v].split(";")
					//      0         1             2                3          4
					// $jetzt+userName+";"+camera.Lon()+";"+camera.Lat()+";"+text
					var vd = new L.LatLng(vi[2],vi[3])
					var no = "Note from "+vi[1]+": "+vi[4]
					L.circleMarker(vd, {color:'yellow' , radius:3, title:no} ).on('click',contextmenu).addTo(notes).name = no
					// title will not work! ToDo: https://stackoverflow.com/questions/11222538/leaflet-js-how-to-create-tooltips-for-l-circlemarker
			    }
	        }
	    }
	    xmlhttpN.open("GET", "../user/notes.txt", true)
	    xmlhttpN.send()

		//// Visited places
	    var
		xmlhttpV = new XMLHttpRequest()
	    xmlhttpV.onreadystatechange = function() {
	        if ((xmlhttpV.readyState == 4) && (xmlhttpV.status == 200)) {
				//console.log("visits:",xmlhttpV.response)
				var vs = xmlhttpV.response.split("<br>")
			    for (v in vs) {
					if(vs[v].length<9) continue
			    	var vi = vs[v].split(";")
					if(vi[4]=="karlos") continue
					var vd = new L.LatLng(vi[0],vi[1])
					var vr = new L.LatLng(vi[2],vi[3])
					if((userName=="karlos")&&(vs.length==(v*1+2))) {
						L.polyline([vd,vr],{color:'black', opacity:0.2}).addTo(visits)
						L.circleMarker(vr, {color:'black', radius:4, title:"Visit from here"}   ).on('click',contextmenu).addTo(visits).name = "Visit from "  +vi[4]
					}	L.circleMarker(vd, {color:'red'  , radius:4, title:"Visit from "+vi[4]} ).on('click',contextmenu).addTo(visits).name = "Visited from "+vi[4]
			    }
	        }
	    }
	    xmlhttpV.open("GET", "../user/visits.txt", true)
	    xmlhttpV.send()
	}

	//console.log("update")
    var xmlhttp = new XMLHttpRequest()
    xmlhttp.onreadystatechange = function() {
        if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)) {
			if( AvatarsCreate(xmlhttp.response,init) )
			//	 timeout =  1000 //	setTimeout("update(0)", 1000)
			//se timeout = 10000 // setTimeout("update(0)",10000)
			init = false
        }
    }
    xmlhttp.open("GET", "../xchg.php?pos=0;"+init+";2;3;4;5;6", true) // osmgo.org/xchg.php?pos=userID;x;y;z;xr;yr;v  
    xmlhttp.send()

	if( logs>0) {
		logs--
		console.log("Map Log/Active:"+logs+"/"+activCount)
	}

	
	if(activCount||init)	setTimeout("update(0)", 1000) // ist derZyklus so stabieler?
	else					setTimeout("update(0)",10000)
}



var pointDown = false
var pointTime = undefined

function pointdown (e) {
	pointDown = true
	pointTime = setTimeout("pointtime()", 300)
//	console.log("DOWN")
}

function pointmove (e) {
    pointDown = false
	clearTimeout(pointTime)	;pointTime = undefined
//	console.log("MOVE")
}

function pointup (e) {
	clearTimeout(pointTime)	;pointTime = undefined
	pointDown = false
//	console.log("UP--")
}

function pointtime (e) {
//	console.log("time",pointDown,mapclickNO)
	setTimeout("pointtime2()", 300)
}

function pointtime2(e) {
//	console.log("time2",pointDown,mapclickNO)
	if(!pointDown)
	if(map._zoom>1) map.setView(map._lastCenter, map._zoom-1, {animate:true})
}




function keypress(e) {
	var key = e.originalEvent.key
//	console.log(key)
	//if(key=="F1" || key=="?")
		window.open("http://osmgo.org/info","_blank")
}


var mapclickLL = undefined  // free to be used
var mapclickNO = false

function mapclick(e) {
	mapclickLL = e.latlng
	setTimeout("mapclickdone()", 300)
}

function mapdblclick (e) {
	mapclickLL = undefined
	// Zoom will be done by eaflet-default
}

function mapclickdone() { // no dblclick
	/* AUSGESCHALTET
	if(mapclickLL && !mapclickNO) // not undefined and not blocked by 0
		if(map._zoom>1) map.setView(map._lastCenter, map._zoom-1, {animate:true})
	mapclickLL = undefined	
	*/
	mapclickNO = false	
//	console.log("Klick done")
}


function contextmenu(e) {

	L.DomEvent.stopPropagation(e)
	mapclickNO = true // blocked by contextmenu
	// event.preventDefault()
	// console.log("e.latlng",e.latlng,e.target._latlng)
	var ele = 101;	    if(e.target.ele)     ele = e.target.ele
	var dir =   0;	    if(e.target.dir)     dir = e.target.dir
	var view= -10;	    if(e.target.view)    view= e.target.view
	var til =   3;	    if(e.target.tiles)   til = e.target.tiles
	var ll  = e.latlng ;if(e.target._latlng) ll  = e.target._latlng 
	var lat = ll.lat
	var lng = ll.lng ;if(lng>+180) lng -= 360 ;if(lng<-180) lng += 360
	var loc = '<a href="javascript:doCenterPlace(0,'+lat+','+lng+');"><img src="images/navigation.png" width="20" alt="zoom"/></a>'
	var men = placeMenu(lat,lng,ele,16,dir,view,til)

	var nam_ = lat.toFixed(8)  +'° / '+ lng.toFixed(8)+'°'
	var type = ""
	if(e.target.type) type = e.target.type
	if(e.target.name) nam_ = e.target.name
	else { // Freier Klick
		addYou(lat,lng, ele,14,dir,view,tiles,"You: ",nam_  ).setIcon(locationIcon)
		map.addLayer(you)
	}//äää
	popup = L.popup() // ToDo: popup-Instanzen wieder löschen
			 .setLatLng([lat,lng])
			 .setContent(type+nam_ +"<br>"+ loc + men)
			 .openOn(map)
}
