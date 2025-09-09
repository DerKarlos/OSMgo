// Vector tiles - Chemniz

function VectorRead(json) {	
	ways =[] // Ways werden an der Tile-Grenze zerschnitten unnd gibt es daher mehrfach
    wayNeLaI = 0
    wayNeLaP = 0
	wayFirst = 0

	var objects    = json.objects
	var roads      = objects.roads
	var water	   = objects.water
	var landuse	   = objects.landuse
	var buildings  = objects.buildings

	if(water.type     != "GeometryCollection") alert(    "water.tpye != GeometryCollection")
	if(roads.type     != "GeometryCollection") alert(    "roads.tpye != GeometryCollection")
	if(landuse.type   != "GeometryCollection") alert(  "landuse.tpye != GeometryCollection")
	if(buildings.type != "GeometryCollection") alert("buildings.tpye != GeometryCollection")
	
	// GLOBALS:
	arcs     = json.arcs
	scaleLon = json.transform.scale[0] // lon
	scaleLat = json.transform.scale[1] // lat
	transLon = json.transform.translate[0]
	transLat = json.transform.translate[1]


	///// landuse: ??
	for(index in landuse.geometries) {
		var geometry = landuse.geometries[index]

		switch(geometry.type) {
		case "MultiPolygon":
		case "Polygon":
			var main = "landuse"
			var kind = geometry.properties.kind
			switch(kind) {
			case "generator":
			case "substation":	main = "power"		;break
			case "theatre":
			case "parking": 	main = "amenity"	;break
			case "pitch":   	main = "leisure"	;break
			case "bridge":  	main = "man_made"	;break
			case "natural_wood": main= "natural"	;kind = "wood"	;break
			}
			vectorWay(geometry, main, kind, true)	;break
		default:
			log("Vector TODO: landuse geo type: "+geometry.type)
		}//landuse 
	}

	///// water: waterway,
	for(index in water.geometries) {
		var geometry = water.geometries[index]

		if(geometry.type=="Point")
			vectorPoint(geometry)
		else
		if(geometry.type=="Polygon" || geometry.type=="MultiPolygon")
			vectorWay(geometry, "waterway", "riverbank",true)

		else
		if(geometry.type=="LineString" || geometry.type=="MultiLineString")
			vectorWay(geometry, "waterway", "stream")

		else log("Vector TODO: warter geo type: "+geometry.type)
	}//buildings 


	///// buildings: building,
	for(index in buildings.geometries) {
		var geometry = buildings.geometries[index]

		switch(geometry.type) {
		case "Point":
			vectorPoint(geometry)	;break
		case "MultiPolygon":
		case "Polygon":
			vectorWay(geometry, "building", "yes", true)	;break
		default:
			log("Vector TODO: building geo type: "+geometry.type)
		}

	}//buildings 


	///// roads:  highway,railway,
	for(index in roads.geometries) {
		var geometry = roads.geometries[index]
		
		var type = "???"
		switch(geometry.properties.kind) {
		case "major_road":
		case "minor_road":
		case "path":
			type = "highway" ;break
		case "rail":
			type = "railway" ;break
		default:
			log("Vector TODO: roads geo kind: "+geometry.properties.kind)				;break
		}
		
		switch(geometry.type) {
		case "MultiLineString":
		case "LineString":		vectorWay(geometry, type, geometry.properties.kind_detail)	;break
		default:				log("Vector TODO: roads geo type: "+geometry.type)			;break
		}		
	}//road

}


function vectorPoint(geometry) {
	var osmID = geometry.properties.id
		if(osmID==1204635239)
		log("lllllllll")

	if(geometry.properties.kind == "building") {
		var newKARL   = new Way(osmID)
		if(newKARL.id!=0) {
			log("Vector TODO: point builing id=bekannt: "+osmID)
			return
		}
	newKARL = ways[osmID]
	newKARL.AddTag("addr:street",      geometry.properties.addr_street)
	newKARL.AddTag("addr:housenumber", geometry.properties.addr_housenumber)
	return
	}

	if(geometry.properties.kind != "address") {
		log("Vector TODO: node kind: "+geometry.properties.kind)
		return
	}

	var x = geometry.coordinates[1] //lon
	var z = geometry.coordinates[0] //lat
	var lat = x * scaleLat + transLat
	var lon = z * scaleLon + transLon
	var newKARL   = new Node(osmID,lat,lon)
	if(newKARL.id==0) {	// if schon da adresse auch da dazu taggen
		newKARL = ways[osmID]
	}
	newKARL.AddTag("addr:street",      geometry.properties.addr_street)
	newKARL.AddTag("addr:housenumber", geometry.properties.addr_housenumber)
}

function vectorWay(geometry, type, detail, area) { // there areas "way"
	if(!area) area = false
	// properties später
	var osmID = geometry.properties.id
		
		if(osmID==1204635239)
			log("lllllllll")
		
	var newKARL   = new Way(osmID)
	if(newKARL.id==0) {
	//	newKARL = new Way(0)  // Gleiche OSM-ID? Egal, dann "erfundenen ID"
		newKARL = ways[osmID] //                 Fortsetzen
		if(!area)
			newKARL.wayNodes.pop() //???????
	}
	else
	newKARL.AddTag(type,detail)

	// if(geometry.arcs.length>1) log("Vector TODO: geometry.arcs.lenght>1")
	for(arcID in  geometry.arcs) {
		var arc = arcs[ geometry.arcs[arcID] ]
		var x = z = 0
		for(pointID in arc) {
			var point = arc[pointID]
			x += point[1] //lon   incrementell!!!
			z += point[0] //lat
			var lat = x * scaleLat + transLat
			var lon = z * scaleLon + transLon
			var nodeKARL = new Node(0,lat,lon)  // Simulieren einer Node
			if(nodeKARL.id==0) alert("nodeKARL.id==0")
    
			var wayNodes = newKARL.wayNodes
			if(wayNodes.length>0) {
				var last = nodes[ wayNodes[wayNodes.length-1] ]
				if(last.id==1308 || last.id==1291)
					log("kkkkkkkkkkkk")
				if(nodeKARL.x==last.x && nodeKARL.z==last.z)
					continue // doublette, don't add, next point
			}
			//log(point[0] , point[1],lon,lat)
			newKARL.AddNode(nodeKARL.id)
		}//arc
	}//arcs
	
	if(area)
		newKARL.AddNode(newKARL.wayNodes[0]) // Letzte=erste wie bei OSM

	if(osmID==92443957)	newKARL.AddTag("3dmr","11") // TCC Haus A
	if(osmID==92443429)	newKARL.AddTag("3dmr","12") // TCC Haus B
	if(osmID==92443431)	newKARL.AddTag("3dmr","13") // TCC Haus C-D
	if(osmID==92443965)	newKARL.AddTag("3dmr","14") // TCC Haus E-G

}//place


/* 

http://85.214.118.251:8080/all/16/35119/21999.topojson


Es geht ein par was, gibt aber noch einige "Effete"
Dein Vector topoJson Server ist schön schnell. Zoom 16 ist nicht groß. Geht auch 15 oder so?
3DMR kann nicht gehen, der TAG ist bei deinen Tiles nicht enthalten
Damit es geht an die URL anhängen:  &ser=3    weil dein Server der dritte ist, denn ich anzapfe. Und  &til=16  ist Zoom, da kannst du testen, wenn anderes geht.
http://osmgo.org/go.html?lat=50.79068212&lon=12.91698248&ele=288.39&dir=357&view=-30&dbg=1.5&fps=10&con=1&tiles=4&opt=0&ser=3&til=16
Darf ich so einen Link auch bei Twitter? Da würde ja dein Server belastest und benutzt. Kritisch ist das aber nicht.


type	"Point"
properties	
label_placement	true
kind	"address"
area	0
sort_rank	475
addr_street	"Straße Usti nad Labem"
scale_rank	5
source	"openstreetmap.org"
min_zoom	17
addr_housenumber	"14"
id	1917629167
coordinates	
0	1576
1	1941


http://osmgo.org/go.html?lat=50.79522049&lon=12.91752510&ele=550.52&dir=0&view=-90&user=karlos&dbg=1&fps=10&con=1&tiles=4&opt=0&ser=3&til=16&dbg=1.5	
http://osmgo.org/go.html?lat=50.79976447&lon=12.90589478&ele=357.67&dir=0&view=-89&user=karlos&dbg=1.5&fps=10&con=1&til=16&opt=0&ser=3&tiles=2	
*/ // TCC Haus 