var LAT_FAKT = 111100 // ist genau genug  111120 = 1.852 * 1000.0 * 60  // 1 NM je Bogenminute: 1 Grad Lat = 60 NM = 111 km, 0.001 Grad = 111 m
var lonFakt = LAT_FAKT
var initGeoPosLat = 51.50706135  // curGeoPosL
var initGeoPosLon = -0.12781402


// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function lon2tileX(lon,zoom) {   return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
function lat2tileY(lat,zoom) {   return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }
function tileX2lon(  x,zoom) {   return (x/Math.pow(2,zoom)*360-180);}
function tileY2lat(  y,zoom) {   var n=Math.PI-2*Math.PI*y/Math.pow(2,zoom) ;return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));  }

var elementIndex = 0
var url = "---"

//r tileSizeLa  = 0.002 // 0.005  grad  (0.001=111m)
//r tileSizeLo  = tileSizeLa * 1.5
//r tileDistMax = 4

var latIndexView0
var lonIndexView0
var latIndexViewP
var lonIndexViewP


function GetLon2x(lon,lat) { 	//if(!lat) alert("!lat!")
	lonFakt = LAT_FAKT * Math.cos(  Math.abs(lat / 180 * Math.PI) );
	var meter = (lon - initGeoPosLon) * lonFakt
	return Math.floor(meter*100)/100 // cm ist genau genug
}


function GetLat2z(lat) {
	var meter = (initGeoPosLat - lat) * LAT_FAKT  
	return Math.floor(meter*100)/100 // cm ist genau genug
}  // Grad PLUS = Meter MINUS !! "In den Hintergrund"



function addLatLon(mesh,lat,lon,roty) {
	var	tileX = lon2tileX(lon,viewLevel) // Assuming, that tile exists already by the object, the repository mesh is caused
	var	tileY = lat2tileY(lat,viewLevel) // -z
	var ti = viewTiles[tileY][tileX]
	if(!ti) {
		alert("ti.map undefined")
		return
	}
	var ma = ti.map
	var latTile = tileY2lat(ti.latIndex+1,viewLevel) // latIndex*tileSizeLa
	var lonTile = tileX2lon(ti.lonIndex  ,viewLevel) // lonIndex*tileSizeLo // Tiles sind weg vom Equator schmaler
		initGeoPosLon = lonTile // Math.floor(lon/tileSizeLo)*tileSizeLo // Tiles sind weg vom Equator schmaler
		initGeoPosLat = latTile // Math.floor(lat/tileSizeLa)*tileSizeLa
		mesh.position.x = GetLon2x(lon,lat)
		mesh.position.z = GetLat2z(lat)
		mesh.rotation.y = g(roty)
	    ma.add(mesh)
}



THREE.PerspectiveCamera.prototype.Lon = function() {
	var lat = -this.position.z / LAT_FAKT + initGeoPosLat
	lonFakt = LAT_FAKT * Math.cos(  Math.abs(lat / 180 * Math.PI) );
	return +this.position.x / lonFakt  + initGeoPosLon
}
THREE.PerspectiveCamera.prototype.Lat = function() { return -this.position.z / LAT_FAKT + initGeoPosLat }



// +X  longitude = 11.087  +X  ORST = Positiv  WEST = Negativ  <=>  +X_Kamera/WebGL
// -Z  latitude  = 49.715  -Z  NORD = Positiv  SÜD  = Negativ  <=>  -Z_Kamera/WebGL   !! Grad PLUS = Meter MINUS !! "In den Hintergrund"

var loadedData   = 0
var elementsData = 0


function add2Tile(obj,nodeID) { // for root-"maps" no such function are nececary
	if(!nodeID) var node = obj.osm
	else        var node = nodes[nodeID]
		
	if(!node) { alert("addMap") ;return}

	if(node.tileY<latIndexView0) node.tileY = latIndexView0  // outside load area? set inside
	if(node.tileX<lonIndexView0) node.tileX = lonIndexView0
	if(node.tileY>latIndexViewP) node.tileY = latIndexViewP
	if(node.tileX>lonIndexViewP) node.tileX = lonIndexViewP

	if(!viewTiles[node.tileY])				{ maps.add(obj) ;return } // tileMake(node.tileY, node.tileX) üüü  place "large"
	if(!viewTiles[node.tileY][node.tileX])	{ maps.add(obj) ;return } // tileMake(node.tileY, node.tileX)

	var map = viewTiles[node.tileY][node.tileX].map
	if(obj.osm.GetTag("room"))
	     map.more.add(obj)
	else map.add(obj)
}

function add2TileG(geo,iCol,nodeID) { // for root-"maps" no such function are nececary
	if(!nodeID) var node = geo.osm
	else        var node = nodes[nodeID]
		if(!node)
			{ alert("addMap üüü3") 
			 return}
	if(node.tileY<latIndexView0) node.tileY = latIndexView0  // outside load area? set inside
	if(node.tileX<lonIndexView0) node.tileX = lonIndexView0
	if(node.tileY>latIndexViewP) node.tileY = latIndexViewP
	if(node.tileX>lonIndexViewP) node.tileX = lonIndexViewP

	var ti = viewTiles[node.tileY][node.tileX]
	var ma = viewTiles[node.tileY][node.tileX].map
  //if(geo.osm.GetTag("room")) { ma.more.add(geo?mesh) ;return}

	var m = new THREE.Matrix4()

	if(geo.faces.length!=geo.faceVertexUvs[0].length) alert("mist vertex 1")
	ti.mgeo.merge(geo,m,iCol) // mmm
}


function addMap(mesh,nodeID) { // for root-"maps" no such function are nececary
	if(!nodeID) var node = mesh.osm
	else        var node = nodes[nodeID]
		if(!node)
			{ alert("addMap") ;return }
	if(!viewTiles[node.tileY])				{ maps.add(mesh) ;return } // tileMake(node.tileY, node.tileX) üüü  place "large"
	if(!viewTiles[node.tileY][node.tileX])	{ maps.add(mesh) ;return } // tileMake(node.tileY, node.tileX)

	if(mesh.geometry.faces.length!=mesh.geometry.faceVertexUvs[0].length) alert("mist vertex 2")
	
	var dx = Math.abs(mesh.position.x-posX0)
	var dz = Math.abs(mesh.position.z-posZ0)
	var dd = Phytagoras(dx,dz)
	var d0 = dd<200
	
	if(gOptimize==0 || d0 || (!mesh.material.iCol) ) 
  	  	 viewTiles[node.tileY][node.tileX].map.add(mesh) // Tile must exist already. Done by "viewTileShow"
	else {
		var tile = viewTiles[node.tileY][node.tileX]
		    tile.mgeo.merge(mesh.geometry, new THREE.Matrix4().makeTranslation(mesh.position.x,mesh.position.y,mesh.position.z), mesh.material.iCol )
	}
}


function addMore(mesh,nodeID) {
	if(!nodeID)  node = mesh.osm
	else         node = nodes[nodeID]
	if(!viewTiles[node.tileY])				{ maps.add(mesh) ;return } // tileMake(node.tileY, node.tileX) üüü  place "large"
	if(!viewTiles[node.tileY][node.tileX])	{ maps.add(mesh) ;return } // tileMake(node.tileY, node.tileX)

	var dx = Math.abs(mesh.position.x-posX0)
	var dz = Math.abs(mesh.position.z-posZ0)
	var dd = Phytagoras(dx,dz)
	var d0 = dd<200	
	var dd = node.GetTag("3dmr")

	if( gOptimize<2 || d0 || node.GetTag("GO-Note") || dd ) {
		if(dd)	viewTiles[node.tileY][node.tileX].map.add(mesh)
		else	viewTiles[node.tileY][node.tileX].map.more.add(mesh)
	}
	else {
		var geo = mesh.geometry
		if(!geo) {
			log("addMore: no fgeo")
			viewTiles[node.tileY][node.tileX].map.more.add(mesh)
			return
		}
		if(!geo.faces) {
			//log("addMore: no faces")
			viewTiles[node.tileY][node.tileX].map.more.add(mesh)
			return
		}
		else
		if(geo.faces.length!=geo.faceVertexUvs[0].length) {
			// log("addMore: bad vertex")
			assignUVs(geo)
		}
		var tile = viewTiles[node.tileY][node.tileX]
		    tile.ogeo.merge(geo, new THREE.Matrix4().makeTranslation(mesh.position.x,mesh.position.y,mesh.position.z), mesh.material.iCol )
	}

}

function loadTileMake(latIndexV,lonIndexV) {
	var p = Math.pow(2,diffLevel)
	var latIndexL = Math.floor(latIndexV/p)
	var lonIndexL = Math.floor(lonIndexV/p)
	
	if(loadTiles[latIndexL])
		if( loadTiles[latIndexL][lonIndexL]) {
			// log("loadTiles schon da ",latIndexL,lonIndexL,loadTiles[latIndexL][lonIndexL].state) //  
			if(loadTiles[latIndexL][lonIndexL].state ) return // already made
		}
	var 
	tile = new Object()
	tile.state    = 1 // 0=Canel? 1=toLoad&show. (?2=loading) 3=Visible. 4=Hidden
	tile.lonIndex = lonIndexL
	tile.latIndex = latIndexL
	tile.name = "loadTile-"+lonIndexL+"/"+latIndexL

	if(!loadTiles[latIndexL]) loadTiles[latIndexL] = []
	    loadTiles[latIndexL][           lonIndexL] = tile
}




function viewTileMake(latIndex,lonIndex) {


	if(viewTiles[latIndex])
		if( viewTiles[latIndex][lonIndex]) {
			// log("tileMake schon da ",latIndex,lonIndex,viewTiles[latIndex][lonIndex].state) //  
			if(viewTiles[latIndex][lonIndex].state ) return // already made
	}

	var 
	tile = new Object()
	tile.state    = 1 // 0=Canel? 1=toLoad&show. (?2=loading) 3=Visible. 4=Hidden
	tile.lonIndex = lonIndex
	tile.latIndex = latIndex
	tile.map      = new THREE.Mesh() // Map for main objects
	tile.map.more = new THREE.Mesh() // Map for nodes and other details

//	tile.map.visible = false
	tile.map.more.visible = false
	tile.map.more.tile    = true
	if(isNaN(lonIndex)) 
		alert("lonIndex NaN")
	tile.map.name = "makeTile-"+lonIndex+"/"+latIndex
  //tile.name     = "makeTile-"+lonIndex+"/"+latIndex // weg??
	tile.map.add(tile.map.more)		 // if map is hidden, more is hidden too
	maps.add(tile.map)

	var latTile    = tileY2lat(latIndex+1,viewLevel) // latIndex*tileSizeLa
	var lonTile    = tileX2lon(lonIndex  ,viewLevel) // lonIndex*tileSizeLo // Tiles sind weg vom Equator schmaler
	var latTileE   = tileY2lat(latIndex  ,viewLevel)
	var lonTileE   = tileX2lon(lonIndex+1,viewLevel) // on is counting up Index and grad, lat is invers!
	var	lastLoadx  = GetLon2x( lonTile,   latTile)  
	var	lastLoadz  = GetLat2z( latTile           )
	var	lastLoadEx = GetLon2x( lonTileE,  latTile)
	var	lastLoadEz = GetLat2z( latTileE          )

	var tileTime

	var material = mlm.floor
	if(FilterType>1) material = FilterMaterial

	var
	gPlane = new THREE.PlaneBufferGeometry(lastLoadEx-lastLoadx,lastLoadz-lastLoadEz,1,1)
	var
	mplane = new THREE.Mesh(gPlane,material)
	mplane.rotation.x =  g(-90)
	mplane.position.x = lastLoadx + mplane.geometry.parameters.width /2
	mplane.position.z = lastLoadz - mplane.geometry.parameters.height/2
	mplane.position.y = -DrawDelta*9 // Untergrund unter Wege
	mplane.name = "tile"+latIndex+"/"+lonIndex
	/* if(this.subView) mplane.position.y = -99
	else*/ mplane.receiveShadow = shadow
    tile.map.add(mplane)
	tile.floor = mplane
    tile.mgeo = new THREE.Geometry()
    tile.ogeo = new THREE.Geometry()
	tile.mgeo.name = "## mGeo ##" // mmmm
	tile.ogeo.name = "## oGeo ##" // mmmm

	if(!viewTiles[latIndex]) viewTiles[latIndex] = []
	    viewTiles[latIndex][lonIndex] = tile

	loadTileMake(latIndex,lonIndex)
	osmBuilder.LoadOsmTiles() // triger loading
}

// Called if the camear changes to nanother tile: Make tiles hidden/visible/to-be-loaded
function viewTileShow(latIndex,lonIndex,show) { // un-/set visible, return true if exists
	// log("show tile: ",latIndex,lonIndex)  // 0: hide 1:ways 2:+nodes
	if(viewTiles[latIndex])
		if( viewTiles[latIndex][lonIndex]) {
			var tile = viewTiles[latIndex][lonIndex]
			if(tile.state==0 && show >0) { viewTileMake(latIndex,lonIndex)          }
			if(tile.state==1 && show==0) { 
				                           tile.map.visible = false	;tile.state = 0 }
		//	if(tile.state==2 && show==0) { tile.map.visible = false	;tile.state = 0	}  No cancel during load
			if(tile.state==3 && show==0) { 
				                           tile.map.visible = false	;tile.state = 4 } 
			if(tile.state==4 && show >0) { tile.map.visible = true  
				;tile.state = 3	}
			                               
			tile.map.more.visible = (show==2)  // Show also the nodes?
			if(gOptimize>2) tile.map.more.visible = false
			
			// 	if(show) log("SHOW tile: ",latIndex,lonIndex,show)
			return
		}
	if(show) viewTileMake(latIndex,lonIndex)
}


//#########################################################################


       
 
function logW(text) {
	;//  console.log(text)
};
       
       
       
async function asyWasm() {
        console.log("++")
       
 
        // >4K geht nur in Firefox!
        var wasmImports = { env:  {
//  logL,
//  log_,
    new_Node,
    new_Way,
    new_Rel,
    addNodeTag,
    addWayNode,
    addWayTag,
    addRelMem,
    addRelTag,
                                        }/*env*/};
       
	wasmState = 2; // Code laden
    const response     = await fetch('tile.wasm')                   ;console.log("wasm11")    // response of a XMLHttpRequest
    const buffer       = await response.arrayBuffer()               ;console.log("wasm22")    // Byte buffer
    const wasmModule   = await WebAssembly.compile(buffer)  		;console.log("wasm33")    //r wasmModule = new   WebAssembly.Module(wasmCode);
    const wasmInstance = new   WebAssembly.Instance(wasmModule,wasmImports)         //r wasmInsta= await WebAssembly.instantiate(wasmModule, wasmImports);
 
    console.log("exports:",wasmInstance.exports)
 
    expWasm = wasmInstance.exports;
    memWasm = wasmInstance.exports.memory;
    
    //http();
	wasmState = 3; // Code geladen
//	osmDo = 1
    console.log("--")
	osmBuilder.LoadOsmTiles() // triger loading				 
}
 
var nodeKARL
var  wayKARL
var  relKARL
 
 
function atoll(ref) {
  if(ref<0) { logW("_ref:"+ref); return; }
  var txt = new Int8Array(memWasm.buffer, ref, 33);
  var str = new TextDecoder().decode(txt);
      str = str.split(",")[0];
      str = str.split("\n")[0];
      str = str.split("\u0000")[0];
  return str*1;
}

// Dummies, die durch OSM-go ersetzt werden
function new_Node(id,lat,lon) {
  var ll = atoll(id);
  nodeKARL   = new Node(ll,lat,lon) 
  logW("... node (id,lat,lon):"+ll+","+lat+","+lon);
}
 
function new_Way(id) {
  var ll = atoll(id);
  wayKARL   = new Way(ll)
  logW("--- way (id):,"+ll);
}
 
function new_Rel(id) {
  var ll   = atoll(id);
  relKARL  = new Rel(ll)
  logW("=== rel (id):,"+ll);
}
 
function addWayNode(id) {
  var ll = atoll(id);
  if(id==519653630)
	  console.log("wasm519653630")
  if( wayKARL.id)
	  wayKARL.AddNode(ll);
  logW("     wayNode (id):"+ll);
}
function addNodeTag(t,v) {
  var tag = new Int8Array(memWasm.buffer, t, 244);
      val = new Int8Array(memWasm.buffer, v, 244);
      tag = new TextDecoder().decode(tag);
      val = new TextDecoder().decode(val);
      tag = tag.split("\u0000" )[0];
      val = val.split("\u0000" )[0];
	  if( nodeKARL.id)
		  nodeKARL.AddTag(tag,val);
  logW("     nodeTag (tag,val):"+tag+","+val);
}
function addWayTag(t,v) {
  var tag = new Int8Array(memWasm.buffer, t, 244);
      val = new Int8Array(memWasm.buffer, v, 244);
      tag = new TextDecoder().decode(tag);
      val = new TextDecoder().decode(val);
      tag = tag.split("\u0000" )[0];
      val = val.split("\u0000" )[0];
  if( wayKARL.id)
  	  wayKARL.AddTag(tag,val);
  logW("     wayTag (tag,val):"+tag+","+val);
}
function addRelTag(t,v) {
  var tag = new Int8Array(memWasm.buffer, t, 244);
      val = new Int8Array(memWasm.buffer, v, 244);
      tag = new TextDecoder().decode(tag);
      val = new TextDecoder().decode(val);
      tag = tag.split("\u0000" )[0];
      val = val.split("\u0000" )[0];
	  if(relKARL.id)
  		 relKARL.AddTag(tag,val)
  logW("     relTag (tag,val):"+tag+","+val);
}
function addRelMem(t,r,o) {
  var type = new Int8Array(memWasm.buffer, t, 244);
  var ref  = new Int8Array(memWasm.buffer, r, 244);
  var role = new Int8Array(memWasm.buffer, o, 244);
      type = new TextDecoder().decode(type);
      ref  = new TextDecoder().decode(ref );
      role = new TextDecoder().decode(role);
      type = type.split("\u0000" )[0];
      ref  =  ref.split("\u0000" )[0];
      role = role.split("\u0000" )[0];
	  if(relKARL.id)
		 relKARL.AddMember(ref, type, role)
  logW("     relMem (type,ref,role):"+type+","+ref+","+role);
}
 
 
function httpWasm(url) {

    console.log(url);
    var
    xhr = new XMLHttpRequest();
    xhr.open("GET",url); // "test.json" "https://osmgo.org/user/st002.txt"
    xhr.responseType = "arraybuffer";
    xhr.onload       = callbackWasm;
    xhr.send();
    wasmState = 4; // Tile laden
}


 
// Must be Javascript
function callbackWasm(e) { // console.log(e)
  console.log("+++++ callback +++++");
  clearTimeout(tileTime)
 
  // OSM-Daten sind hier:
  var target = e.target;
  var buf    = target.response; // console.log(new TextDecoder().decode(buf));
  var len    = buf.byteLength;   logW("byteLength:"+len);
  var i8buf  = new Int8Array(buf);
 
  // Daten nach C kopieren:
  var ref = expWasm.memRef();
  var out = new Int8Array(memWasm.buffer, ref, len);
 
  for(i =0 ; i<len ; i++)
    out[i] = i8buf[i];
  out[len] = 0;
 
  console.log("===== exp.wasm =====");
  expWasm.wasm();
  wasmState = 5; // Tile geladen
  loadedData = 1
  console.log("----- callback -----");
}
 
 


//#########################################################################





// Called if a new tile pops up or after a load: check if a load is needed, start it
var OsmBuilder = function() {       // als Objekt geklammert

	if(wasmState)
		asyWasm()
       
	

	//--------------------------------------------------------------------------
	// Vom Overpass-API OSM-Daten fuer einen quadratischen Bereich laden.
	//
	// Parameter: Lat- und Long-Koordinaten des Bezugspunkts in Grad,
	//            Kantenlaenge des quadratischen Bereichs in Metern

	
	this.ChangeViewTiles = function(lon,lat) {  // OLD: doOverpassQuery

	
		// hide tiles behind the camera?? ??
		var rad = camera.rotation.y
		var sc  = SinCos(rad,0)

		if(initGeoPosLat==51.50706135 && gCustom!=3) {  // 3 schaltet die Parameter aus
			viewLevel   = GET_ParD("vil" ,17 )*1 ;if(viewLevel<14) viewLevel=14 ;if(viewLevel>19) viewLevel=19 // 17 => 190m
			tileDistMax = GET_ParD("tiles",tileDistMax)*1
		}
		
		var lonIndex = lon2tileX(lon,viewLevel) //Math.floor(lon/tileSizeLo)
		var latIndex = lat2tileY(lat,viewLevel) //Math.floor(lat/tileSizeLa)
		var latTile  = tileY2lat(latIndex+1,viewLevel) //		var lonTile  = lonIndex*tileSizeLo // Tiles sind weg vom Equator schmaler
		var lonTile  = tileX2lon(lonIndex  ,viewLevel) //		var latTile  = latIndex*tileSizeLa
		var latTileE = tileY2lat(latIndex  ,viewLevel)
		var lonTileE = tileX2lon(lonIndex+1,viewLevel)

		//log(lat,lon,latTile,lonTile,tileSizeLa,latIndex,lonIndex)

		if(initGeoPosLat==51.50706135) {
			var xz = [0,0]
			if(!GET_ParD("km",0)*1) { // Kein Start per Key_M
		//	xz = SinCos(dir, Math.sin(view*2)*posY0 )
		  	xz = SinCos(dir,                  posY0 )
			}	
		//	tileSizeLa  = GET_ParD("tile" ,tileSizeLa )*1 ;if(tileSizeLa<0.0005) tileSizeLa=0.0005
		//	tileSizeLo  = tileSizeLa * 1.5			
			initGeoPosLon = lonTile // Math.floor(lon/tileSizeLo)*tileSizeLo // Tiles sind weg vom Equator schmaler
			initGeoPosLat = latTile // Math.floor(lat/tileSizeLa)*tileSizeLa
			posX0 = camera.position.x = GetLon2x( lon, lat) - xz[0]
			posZ0 = camera.position.z = GetLat2z( lat     ) + xz[1]
			if(control) if(control.Flight) if(control.Flight.flightObj)
			{
				control.Flight.flightObj.position.copy(camera.position)
				control.Flight.flightObj.rotation.copy(camera.rotation)
			}
		}

		lastLoadx  = GetLon2x( lonTile,  latTile)  
		lastLoadz  = GetLat2z( latTile          )
		lastLoadEx = GetLon2x( lonTileE, latTile)
		lastLoadEz = GetLat2z( latTileE         )
		// log(lastLoadx,lastLoadEx,lastLoadz,lastLoadEz)

        if(lowDome) 
            lowDome.position.set( lastLoadx, DrawDelta * 6, lastLoadz)
					
		// ALL close coordinates: Create or show
		viewTileShow(latIndex,lonIndex, 2)  // Center tile first
		for(    var la=latIndex-tileDistMax-1 ; la <= latIndex+tileDistMax+1 ; la++)
		{	for(var lo=lonIndex-tileDistMax-1 ; lo <= lonIndex+tileDistMax+1 ; lo++) {
				var dlo = Math.abs(lo-lonIndex)
				var dla = Math.abs(la-latIndex)
				var dis = Math.max(dla,dlo)
				     if( dis<=/*1*/moreMax) viewTileShow(la,lo,2) // same or next
				else if( dis<=tileDistMax)  viewTileShow(la,lo,1) // visible
			    else                        viewTileShow(la,lo,0) // invixible but loaded already
			}
		}

		// Check EXISTING tiles. Not Close?: hide (close to "look at" tile)
		for(var la in viewTiles) {			//log("tiles la: ",la)
			for(var lo in viewTiles[la]) {	//log("tiles lo: ",lo)
				var tile = viewTiles[la][lo]
				var dla = Math.abs(tile.latIndex-latIndex)
				var dlo = Math.abs(tile.lonIndex-lonIndex) //Inde5??
				var dis = Math.max(dla,dlo)

				if(dis>(tileDistMax)){viewTileShow(la,lo,0)}	// Distandce not near?
				else if(dis>/*1*/moreMax) viewTileShow(la,lo,1)
					 else                 viewTileShow(la,lo,2)
			}
		}
		

	}//ChangeViewTiles

	
	this.LoadTiles = function() {

		if(tileLoading)  return
		if(wasmState==2) return
		
		var c = 0 // laod-level how many levels less but the view-level

		/* Not the own position first but the next to view to OUT ööö
		var rad = camera.rotation.y
		var sc  = SinCos(rad,1) */
		var loadLevel = viewLevel-diffLevel

		var lon = camera.Lon()	//		var lon = GetX2Lon( camera.position.x)
		var lat = camera.Lat()	//		var lat = GetZ2Lat(-camera.position.z)
		var lonIndex = lon2tileX(lon,loadLevel) //+ 0.5 + sc[0] // No floor! But -0.5 to come to the compared corner of the tile
		var latIndex = lat2tileY(lat,loadLevel) //- 0.5 + sc[1]
		
		var latTile = lonTile = tileToLoad = 0

		var a=0
		var minTilLoad = 9e9

		// search for the closest tile to be loaded
		tileToLoad = false
		for(la in loadTiles) {
			for(lo in loadTiles[la]) {
				tile = loadTiles[la][lo]
				if(tile.state == 1) { 
					var dla = Math.abs(tile.latIndex-latIndex)
					var dlo = Math.abs(tile.lonIndex-lonIndex)
					var dis  = Phytagoras(dla,dlo)
					if( minTilLoad > dis ) {	// Closest tile? 
						minTilLoad = dis
						tileToLoad = tile
					}
				}
			}
		}
		if(!tileToLoad) return

		var latTile    = tileY2lat(tileToLoad.latIndex+1, loadLevel) //x tile.latIndex*tileSizeLa
		var lonTile    = tileX2lon(tileToLoad.lonIndex  , loadLevel) //y tile.lonIndex*tileSizeLo
		var latTileE   = tileY2lat(tileToLoad.latIndex  , loadLevel) // End coordiantes
		var lonTileE   = tileX2lon(tileToLoad.lonIndex+1, loadLevel)

		tileToLoad.state = 2
	//	if(osmDo==-1) return //**Simulation

		tileLoading = tileToLoad
		osmDo = 1
		var latIndexL = tileLoading.latIndex
		var lonIndexL = tileLoading.lonIndex
		var p = Math.pow(2,diffLevel)
		latIndexView0 = latIndexL*p
		lonIndexView0 = lonIndexL*p
		latIndexViewP = latIndexL*p+p-1
		lonIndexViewP = lonIndexL*p+p-1
		
	    var bbox =     + (latTile ).toFixed(8) + "," + (lonTile ).toFixed(8) + ","
	                   + (latTileE).toFixed(8) + "," + (lonTileE).toFixed(8) ;
				
		//var url = httpx+"overpass.osm.rambler.ru/cgi"				// Russland
		//var url = httpx+"api.openstreetmap.fr/oapi/interpreter"	// France		
		  var url = httpx+"overpass-api.de/api"
	            + "/interpreter?data=[out:json];("
		
				+ "rel( "+bbox+");"
					//		+ "  (._;>;);"  // ???????	
					//		+ "  (._;<<;);"  // Nötig für Sites(rel of rel) Alex. Overpass dauert aber Ewig!
		if(gAviation)
		url	   += 'node["generator:source"="wind"]('+bbox+');node["place"]('+bbox+');'
		else
		url	   += "node("+bbox+");"
		
		url	   += "way( "+bbox+");"
						+ "  (._;>;);"
		//				+ "  (._;<<;);"  // Aktiv: Mehr WAYs aber ohne NODEs dazu!!
		
				+ ");out;"

		if(gServer==3) {
			url = "http://85.214.118.251:8080/all/"+(viewLevel+diffLevel)+"/"+lonIndexL+"/"+latIndexL+".topojson"  // kein httpS! "http://85.214.118.251:8080/all/16/35119/22000.topojson"
			log("URL3:"+url)
		}

		if(gCustom==2) { // Wien
		  url = httpx+"overpass-api.de/api"
	            + "/interpreter?data=[out:json];("
				+ " rel( "+bbox+");"
				+ " way( "+bbox+");"
						+ "  (._;>;);"
				+ ");out;"
		}


	    //--------------------------------------------------------------------------

		if(simul) {
		    if(dbg>1) log("Overpass: SIMULATION");
			loadedData = jQuery.parseJSON( JSON2 )	// Antworttext auswerten in Javascriptvariablen
			return
		}

		if(waysL>waysMax)
			return // Für iOS rechtzeitig aufhöhren

		if(wasmState) {
			httpWasm(url)
		}
		
		else {
			xmlhttp = new XMLHttpRequest()

			xmlhttp.onreadystatechange = function() {

				if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)) {
					if(dbg>1) log("Overpass: Query beantwortet "+ new Date().toLocaleTimeString() );
					//log(xmlhttp.responseText.substr(0,19) )
					clearTimeout(tileTime)
				
					// Das könnte schon in den Renderzyklus:
					loadedData = jQuery.parseJSON( xmlhttp.responseText )	// Antworttext auswerten in Javascriptvariablen
					if(dbg>1) log("Overpass: Text ausgewertet "+ new Date().toLocaleTimeString());
				}
			}

			xmlhttp.onprogress= function(evt) {
				if(dbg>3) log("onprogress - loaded,total: ",evt.loaded , evt.total)
			}

			xmlhttp.open("GET", url, true)
			xmlhttp.send()
		} // kein Wasm

		tileTime = setTimeout("loadTimeout(25)",25000)
				
	    if(dbg>1) log("Overpass: "+tileToLoad.lonIndex+"/"+tileToLoad.latIndex+" "+ new Date().toLocaleTimeString());
	    if(dbg>3) log(url)

	} // LoadTiles


///..................

  loadTimeout = function(secs) {
		// hud.Out(["Tile load Timeout! ("+secs,"s) Press key B to restart"])
		log(     "Tile load Timeout! ("+secs+"s) " + new Date().toLocaleTimeString() )
	    // key_B = true
		tileLoading.state = 1// Load again
		tileLoading = false
		osmBuilder.LoadOsmTiles() // check for more to load
  }

	
  this.readJsonData = function() {

	if( wasmState==5) {  // geladen?
	  	 wasmState =3	  // bereit
		 loadedData = 0
		 return false // nicht weiter
	  }

	if(gServer==3) {
		VectorRead(loadedData)
		loadedData = 0
		return false
	}

	if( elementIndex==0 ) {
		elementsData = loadedData ; loadedData = 0  // Viel kopierzeit??
	}
	
		
	/// Schleife brechen wie renderer es tut ########################################################################

	// Alle OSM-Relationen analysieren
	var countdown = 0.11 // s =   15ms+Reserve ~ 16.666ms = 1000/16.666 = 60 FPS
	var dt_e=0

	while(countdown>0) {  //for (var e in elementsData.elements)   // Alle OSM-Elemente: Node/Way/...
		if(!elementsData.elements[elementIndex]) {
			log(" Keine elemente? Kommt vor. URL= " + url)
			return false
		}
		var element = elementsData.elements[elementIndex]

		if (element.type == "node") { // Eine Node (von vielen), Punkt mit GPS-Koordinaten und mehr
			var nodeKARL   = new Node(element.id,element.lat,element.lon)
			var node_tags  = element.tags // dessen OSM-tags
			// Wenn eskeine Tags gibt, gibt es auch keinnen Instanz-Member vom Type Tag-Array!
			for (key in node_tags) { // node-OSM-tags
				//log("key = " + key + ", value = " + node_tags[key]);
				if(nodeKARL.id) {
					nodeKARL.AddTag(key,node_tags[key]) }  // tags++
			} // node_tags nnnn



			if(element.id==3815077900) NodesExebitionPlace()
				
			if(element.id==5171826742)
				log("osm Found: repo Node 5171826742")


			if(element.id==297042815) {
				var node = nodes[297042815]
				ModelPlace(4798,"server","car",node.x,node.z,"obj")
			}


			if(element.id==254014474 && gCustom==3) nodeKARL.typeMain = "Mdl:hide"


			if(   element.id==3195289796) {
				log("node id  3195289796: Add Model Alexanderplatz #####################################")
				var mRel = new Rel("4711")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","DE_berlin_alexanderplatz" )
					mRel.AddMember("3195289796", "node", "center")
					mRel.AddMember("304987177",   "way", "hide"  )	// Outer von REL 4065109 = 2D-Mulitpollygon. Notwendig trotz 4065110?
					mRel.AddMember("4065110",    "rel",	 "hide"  )	// Rel mit vielen  building:part   get das?
					mRel.AddMember("326772329",  "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("230818931",  "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("217537052",  "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("397891642",  "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("96880477",   "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("304987174",  "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("304987173",  "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("304987172",  "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("304987176",  "way",  "hide"  )	// TEST!! ??
	 				mRel.AddMember("96880470",   "way",  "hide"  )	// TEST!! ??
				}
			}
			
			
		//	if(element.id==456045379100000)
		//		nodeKARL.AddTag("3dmr","7")
			
			
			// REL 6610269 = ** ROOT ** Fernsehturm mit Fußumbauung und Freiflächen 
			// +- REL 4564300  2D Turm: Daten und 1 Kreis = WAY 19046101 
			// +- REL 4065110  3D untere Gebäude von TV Tower Berlin: Viele Teile und 
			//    +- REL 4065109 als pseudo/2D "outline" mit  Linie 304987175 als inner , Linie 304987177 als outer
			// Der Turm selbst ist aus parts aber OHNE REL!!!
			// WAY 326772329,230818931,217537052,397891642,96880477,304987174,304987173,304987172,304987176
			// WAY 96880470 Der unterste Ring/Cylinder vom Turm:  height 	10


		    /***  204068874 = Way of Eye with tags in OSM database! */
			if(element.id==1659791900) {  // Node!
				log("node id 1659791900: Add Model London Eye #####################################")
				var mRel = new Rel("4712")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","UK_london_eye" )
					mRel.AddMember("1659791900",     "node","center")
				}
			}/***/
			
			/*  TARDIS     3924951279=Aukland   3701919583=London
			if(element.id==3924951279) {
				nodes[     3924951279].AddTag("3dmr","6")
				nodes[     3924951279].AddTag("direction","315") 
			}
			/**/

				/**
				// if(id==4713) object.rotation.y = g(-45+90)
				log("node id 3701919583: Add Model TARDIS #####################################")
				var mRel = new Rel("4713")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","UK_London_TARDIS" )
					mRel.AddMember("3701919583",  "node","center")
					mRel.AddMember("3701919583", "node", "hide"  )
				}
				**/
			
			// SantaLuzia8    https://3dwarehouse.sketchup.com/model/bed22f2cb9f4a18d388160c360f2a636/Santu%C3%A1rio-de-Santa-Luzia-Portugal
			// https://www.openstreetmap.org/node/2182273818   Viana do Castelo
			// http ://osmgo.org/go.html?lat=41.700051076744174&lon=-8.835169672966005&dir=0&view=-10&ele=101&user=karlos

			/*
			if(element.id==2182273818) {
				var node = new Node(0, 41.70149,-8.83489)
				    node.AddTag("3dmr","7")
					node.AddTag("note","Position for 3D model of Santa Luzia")
			}
			*/	
				/** /
				log("node id 2182273818 Add Model ''SantaLuzia8'' #####################################")
				var mRel = new Rel("4719")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","SantaLuzia8" ) //  mRel.AddTag("model","santaluzia8" )
				//	mRel.AddTag("format","dae" )
					mRel.AddMember(node.id,"node", "center")
					mRel.AddMember("211923748",  "way", "hide"  )
				} /**/


			if(element.id==3722134520) {
				log("node id 3722134520 Add Model ''Dubai Hotel'' #####################################")
				var mRel = new Rel("4714")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","AE_dubai_hotel" )
					mRel.AddTag("format","dae" )
					mRel.AddMember("3722134520","node", "center")
					mRel.AddMember("12700546",   "way", "hide"  )
				}
			}

			if(element.id==4397379799) {
				log("node id 4397379799: Add Model ''Atomium'' #####################################")
				var mRel = new Rel("4715")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","BE_brussels_atomium" ) // 
					mRel.AddTag("format","dae" )
					mRel.AddMember("4397379799","node", "center")
					mRel.AddMember("442046313",  "way", "hide"  )
					mRel.AddMember("442102754",  "way", "hide"  )
					mRel.AddMember("388842414",  "way", "hide"  )
					mRel.AddMember("442046315",  "way", "hide"  )
					mRel.AddMember("1243821",    "rel",	"hide"  ) // ?? why next??
					mRel.AddMember("442044563",  "way", "hide"  ) // ??
				}
			}//4397379799


			if(element.id==1612269507) {
				log("node id 1612269507: Add Model ''Orion Zeigermann'' #####################################")
				var mRel = new Rel("4717")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","orion" ) // 
					mRel.AddTag("format","obj" )
					mRel.AddMember("1612269507","node", "center")
				}
			}//1612269485


			if (element.id==383352481) 
			if (rels[4718]===undefined) {
				log("node id 383352481: Add Model ''Orion ohne Lift'' #####################################")
				var mRel = new Rel("4718")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","orion_" ) // 
					mRel.AddTag("format","obj" )
					mRel.AddMember("383352481","node", "center")
				}
			}//383352481


			if(  element.id==40819160830000) { //  Eiffel
				log("node id    4081916083: Add Model ''Eiffel Tower'' ############## 609816935 ##### 5013364 ##################")
				var mRel = new Rel("4716")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","eiffel" ) // 
					mRel.AddTag("format","obj" )
					mRel.AddMember("4081916083","node", "center")
				}
			}


// Kuala Lumpur: 137396365 ==> 137331261


			if(  element.id==40819160830000) { //  ___WEG_wegen_3dmr Quelle: https://www.thingiverse.com/thing:22051
				log("node id 4081916083: Add Model ''Eiffel Tower'' #####################################")
				var mRel = new Rel("4716")
				if( mRel.id>0 ) {
					mRel.AddTag("type","3d_model")
					mRel.AddTag("server","osm_go")
					mRel.AddTag("model","EifelTower" ) // 
					mRel.AddTag("format","obj" )
					mRel.AddMember("4081916083","node", "center")
					mRel.AddMember("4114840",    "rel",	"hide"  )
					mRel.AddMember("4114841",    "rel",	"hide"  )
					mRel.AddMember("308021389",  "way",	"hide"  )
					mRel.AddMember("308021390",  "way",	"hide"  )

					//el.AddMember("4114838",    "rel",	"hide"  )
					mRel.AddMember("69034180",   "way",	"hide"  )
					mRel.AddMember("69034127",   "way",	"hide"  )
					mRel.AddMember("69034135",   "way",	"hide"  )
					mRel.AddMember("69034179",   "way",	"hide"  )

					//el.AddMember("4114839",    "rel",	"hide"  )
					mRel.AddMember("308145259",  "way",	"hide"  )
					mRel.AddMember("308145258",  "way",	"hide"  )
					

				//	mRel.AddMember("3414744687", "node","hide"  ) // Windräder
				//	mRel.AddMember("3414744686", "node","hide"  )

					mRel.AddMember("308021391",  "way", "hide"  )
					mRel.AddMember("308687749",  "way", "hide"  )
					mRel.AddMember("308687747",  "way", "hide"  )
				}
			}//4081916083







//			if(element.id==3701919583) 				nodeKARL.typeMain = "Mdl:node"

		}// "node"

		// way kommt IMMER nach ALLEN nodes. Also kann man hier sofort den Way bearbeiten

		if (element.type == "way") { // Linie/Kreis von Nodes
			//log("way: ",element)
			var wayKARL   = new Way(element.id)
			var way_nodes = element.nodes // dessen n-array
			  
			for (var n in way_nodes) {  // node-OSM-IDs
				var node_id = way_nodes[n]
				//log("id: ",node_id)
				if(wayKARL.id) wayKARL.AddNode(node_id)
			} // way_nodes
			
			var way_tags = element.tags // dessen OSM-tags
			// Wenn eskeine Tags gibt, gibt es auch keinnen Instanz-Member vom Type Tag-Array!
			for (key in way_tags) { // way-OSM-tags
				//log("key = " + key + ", value = " + way_tags[key]);
				if(wayKARL.id) {
					wayKARL.AddTag(key,way_tags[key]) } // tags++
			} // way_tags





//			if(element.id==204068874)
//				ways[204068874].values[11] = "98"  // 261  90 180 270=9+261

			
			if(element.id==204068874) wayKARL.typeMain = "Mdl:Eye"
			/*
			if(element.id==153273219) wayKARL.typeMain = "Mdl:Eye"
			if(element.id==153273223) wayKARL.typeMain = "Mdl:Eye"
			if(element.id==153273224) wayKARL.typeMain = "Mdl:Eye"
			if(element.id==153273222) wayKARL.typeMain = "Mdl:Eye"
wwww */


			if(element.id==550964809 && gCustom==3) wayKARL.typeMain = "Mdl:hide"
			if(element.id==24261269  && gCustom==3) {
				wayKARL.typeMain = "Mdl:hide"
				var wn = wayKARL.wayNodes[0]
				var node = nodes[wn]
		        ModelPlace(4903,"server","Parkhaus",node.x,node.z,"obj")
			}


			if(parMdl>0) {
				if(element.id==308021389) wayKARL.typeMain = "Mdl:hide"
				if(element.id==308021390) wayKARL.typeMain = "Mdl:hide" //eiffel
				if(element.id== 69034180) wayKARL.typeMain = "Mdl:hide"
				if(element.id== 69034127) wayKARL.typeMain = "Mdl:hide"
				if(element.id== 69034135) wayKARL.typeMain = "Mdl:hide"
				if(element.id== 69034179) wayKARL.typeMain = "Mdl:hide"
				if(element.id==308145259) wayKARL.typeMain = "Mdl:hide"
				if(element.id==308145258) wayKARL.typeMain = "Mdl:hide"
				if(element.id==308021391) wayKARL.typeMain = "Mdl:hide" //eiffel
				if(element.id==308687749) wayKARL.typeMain = "Mdl:hide"
				if(element.id==308687747) wayKARL.typeMain = "Mdl:hide"
				if(element.id==442046313) wayKARL.typeMain = "Mdl:hide"
				if(element.id==442102754) wayKARL.typeMain = "Mdl:hide"
				if(element.id==388842414) wayKARL.typeMain = "Mdl:hide"
				if(element.id==442046315) wayKARL.typeMain = "Mdl:hide"
				if(element.id==442044563) wayKARL.typeMain = "Mdl:hide"
				if(element.id== 12700546) wayKARL.typeMain = "Mdl:hide"
            	
				if(element.id==308145239) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308145237) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308145236) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308145233) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308145234) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687749) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687746) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687755) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687751) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687744) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687754) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687750) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687747) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687748) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687745) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687753) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308687752) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308689165) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308689166) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308689167) wayKARL.typeMain = "Mdl:Eiffel"
				if(element.id==308689164) wayKARL.typeMain = "Mdl:Eiffel"			
			}
		} // if way 
				
		
		if (element.type == "relation") {
			//if(element.id==3403195 || dbg>=5) // ööö				log("OSM relation: ",element.id,element)

			if(dbg>3) log("relation id/type:",element.id,element.tags["type"]);
			
			if(!element.tags) { if(dbg>2) err("Relation without tags "+element.id) }
			else {
			 	if(element.tags["type"]=="3d_model")
					log("############ MODEL: ")
				var rel_tags = element.tags // dessen OSM-tags
				var relKARL   = new Rel(element.id)
				for (key in rel_tags) { // relatoins-OSM-tags
					if(relKARL.id) { relKARL.AddTag(key,rel_tags[key]) } // tags++
				    if(dbg>3)
						log("rel-tag/val: ",key,rel_tags[key])
				} // rel_tags
			
				var members = element.members // relations dessen member-array
				for (var m in members) {
					var member = members[m]
					if(dbg>4) log("rel-member-Nr/ref/type/role: ",m,member.ref,member.type,member.role)
					if(relKARL.id) relKARL.AddMember(member.ref, member.type, member.role)
				} // rel_nodes
				
			} // mit tags

			if(parMdl>0) {
				if(element.id==  1243821) relKARL.typeMain = "Mdl:rel-Atom"
				if(element.id==  4114840) relKARL.typeMain = "Mdl:rel-Eiffel"
				if(element.id==  4114841) relKARL.typeMain = "Mdl:rel-Eiffel"
				if(element.id==  4114842) relKARL.typeMain = "Mdl:rel-Eiffel"
				if(element.id==  4114838) relKARL.typeMain = "Mdl:rel-Eiffel"
				if(element.id==  4114839) relKARL.typeMain = "Mdl:rel-Eiffel"
				if(element.id==  4065110) relKARL.typeMain = "Mdl:rel-Alex"
			}


								
		} // if relation
				
		elementIndex++
		if( elementIndex >= elementsData.elements.length ) {
			elementIndex  = 0 
			elementsData = undefined
			//console.log("END tags,ways,nodes: ",tags,ways.length,nodes.length)
			if(dbg>1) log("Overpass: DATEN VERARBEITET "+ new Date().toLocaleTimeString());
			return false // nicht weiter, fertig
		}
		
		dt_e = clock.getDelta()
		countdown -= dt_e
	} // countdown (ALT: elements)
	
	return true // weiter
  } // readJsonData

} // OsmBuilder


//=============================================================================
// Von aussen zugaengliche Memberfunktionen des OsmBuilder-Objekts



OsmBuilder.prototype.readJsonData = function() {
	return this.readJsonData()
}

		
OsmBuilder.prototype.QueryOsmTiles = function(lon,lat) {
	// fuer eine Geo-Position die OSM-Daten eines quadratischen Bereichs lesen
	this.ChangeViewTiles(lon,lat)  // old doOverpassQuery(lat, lon)
}


OsmBuilder.prototype.LoadOsmTiles = function() {
//	clearTimeout(this.tileTime)
	this.LoadTiles()  // old doOverpassQuery(lat, lon)
}

	
OsmBuilder.prototype.IsOsmDataAvail = function() {
	// Abfrage ob OSM-Daten aufbereitet vorliegen
	return loadedData!=0
}


// ENDE OsmBuilder ======================================================================



function NodesExebitionPlace() {  // ppp ppp 
	
	if(nodes[101]) return
	
	var geometry = new THREE.PlaneBufferGeometry(1111,1111, 1,1)
    var mesh     = new THREE.Mesh( geometry, mlm.white)
	mesh.name = "NodesExebitionPlace"
    mesh.rotation.x = g(90)
	maps.add(mesh)
	
	var x = 0
	var z = 0
	var i = 100
	var d = 0.00003 // 3m
	var node
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","pub")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("information","guidepost")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("man_made","flagpole")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("man_made","surveillance")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("highway","bus_stop")		;node.AddTag("public_transport","platform")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("seamark","any")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("historic","memorial")		;node.AddTag("memorial:type","stolperstein")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("historic","wayside_cross")
	
	z =0 ;x-=d
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","bench")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","grit_bin")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","waste_basket")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","vending_machine")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","atm")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","clock")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","table")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","telephone")
	z =0 ;x-=d
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","post_box")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","parking")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","recycling")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","fountain")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","public_bookcase")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","taxi")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","drinking_water")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("amenity","toilets")

	z =0 ;x-=d
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("tourism","artwork")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("information","board")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("advertising","column")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("place","usburb")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("traffic_signXXX","XXX")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("addr:postcode","AB12")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("communication:mobile_phone","any")
	
	z =0 ;x-=d
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("highway","street_lamp")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("highway","stop")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("highway","give_way")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("highway","traffic_signals")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("highway","crossing")	;node.AddTag("crossing","island")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("highway","crossing")	;node.AddTag("crossing","zebra")
	
	z =0 ;x-=d
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("cycleway","asl")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("emergency","fire_hydrant")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("emergency","phone")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("railway","signal")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("railway","milestone")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("railway","subway_entrance")

	z =0 ;x-=d
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("barrier","bollard")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("barrier","???")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("natural","tree")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("power","generator")	;node.AddTag("generator:source","wind")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("leisure","picnic_table")
	z+=d ;i++ ;node = new Node(i,x,z)	;node.AddTag("leisure","playground")
	
	var // At last one way must be!
	way = new Way(90)

}

/****/
