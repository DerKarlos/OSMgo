import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { ColladaLoader } from 'three/addons/loaders/colladaloader.js';
//tttl mport { DDSLoader } from 'three/addons/loaders/ddsLoader.js';
import { OBJLoader } from 'three/addons/loaders/objLoader.js';
import { MTLLoader } from 'three/addons/loaders/mtlloader.js';
import { set_teststr, sendMail, keyAlt, keyShift } from './controls.js'
import { mLogo } from './hud.js';
import { Node, nodes, reset_nodes, nodeCount, nodeFirst, nodeNeLaP, set_nodeNeLaP, NodeHouse } from './render_node.js';
import { ways, wayFirst, buildingParts, ResetTilesWay, inc_wayIndex, reset_ways } from './render_way.js';
import { reset_rels, relFirst, rels } from './render_rel.js';

import {
	httpx, gCustom, stereoOn, GET_Par, GET_ParD, scene, camera, r, osmDo, lalo0, reset_lalo0, gAviation, clock,
	userID, set_userID, userName, set_userName, latitude, longitude, dbg, log, strGET, simul, replayLog, set_replayLog, multiplay,
	lowDome, lastLoadz, control, set_gpsOn, set_lalo, set_osmDo, tileDistMax,
	mlm, shadow, set_shadow, diffLevel, g, posX0, posZ0, set_userSet, err,
	keepDo, setDome, avatars, keep, parMdl, replay, cEye, set_mesh2Segway, hud
} from './main.js';

import {
	osmBuilder, reset_osmBuilder, GetLon2x, GetLat2z, add_Map, addMore, ResetXTiles, viewTiles,
	tileLoading, set_tileLoading, viewTileMake, LAT_FAKT
} from './osm.js'



/////////////////////////////////////////////////////////////////////////////// Extra gibt MAP?TILE aus OSM, Avatar+GPS-Marker  (HUD mit Logo ist an der Kamera)

export var maps = new THREE.Object3D(); maps.name = "Root:maps" // root mash for all viewTile maps    to Object???
export var chatLast = ""
export var chat0 = ""
export var chat1 = ""
export var chat2 = ""
export var chat3 = "OSM/go global chat"
export var replayI = -1; export function set_replayI(s) { replayI = s } // Todo: move to replay.js
export var MapillaryID = "NOT_PRESENT"

export var gpsAct = undefined; export function set_gpsAct_pos(p) { gpsAct.position = p }

var map_dae

export var layerHeight = 3
export var levelHeight = 3

var dtCount = 0
export var partView = 1  // 1:show  0:hide  -1:hide even "building" if tag "building:part" is set. That's wath 2D-Renderer do?

export var FilterType = 0 //0=aus 1=!Marker 2=Transparent 3=#Gittervar FilterMaterial = null
export var FilterString = ""
export var FilterArray = []
export var FilterMaterial = null
var FilterCount = 0

var replayX = 0; var replayDX = 0
var replayY = 0; var replayDY = 0
var replayZ = 0; var replayDZ = 0
var replayD = 0; var replayDD = 0 // direction NDEW
var replayV = 0; var replayDV = 0 // view up/down
var replayS = 0; var replayDS = 0 // Schräglage
var replayG = 0				  // Glättung
var replayLast = -1

export var ModelDelete = []
var Houses = []

export var colors = []
export var OPAC = 0.90

var wayNeLa = 0 // Place
var relNeLa = 0

export var pockemon = true  	//if(params != "") pockemon = false

export var maxDT = 0.15
var p = navigator.platform
if (p == "iPhone" || p == "iPad") maxDT = 0.7

export function DDMM2D(x) { // Lat/Lon format DDMM.MMM nach D.dezimal
	var d = Math.floor(x / 100) // Grad-Anteil
	var n = (x - d * 100) / 60	  // Grad weg, Minunte/60 = Grad-Nachkommastellen
	return d + n
}


function ResetTiles() {
	reset_nodes()
	reset_ways()
	reset_rels()

	ResetXTiles()


	ResetTilesWay()
	wayNeLa = 0 // Place

	scene.remove(maps)
	maps = new THREE.Object3D()
	maps.name = "Root:maps"
	scene.add(maps)
}



export function Style() { // constructor

	// ddapi = httpx + "osmgo.org//models//api//"   //  httpx+"159.89.12.114/api/"  // "http ://localhost//api//"  //

	this.buildingRoof = this.to(0x694040, undefined, true)
	this.building = this.to(0xE9E0E9, undefined, true) // this.to(0xd9d0c9) //
	this.buildingPlus = this.to(0xcdccc9, undefined, true)
	this.buildingIndoor = this.ds(0x8080ff, 0.7) // transparent
	this.floor = this.ds(0xE9E0E9, 1.0)
	this.floor2 = this.ds(0xf2efe9, 1.0)
	this.plane = this.ds(0xffFF00, 1.0)

	this.line = this.ds(0xc0c0c0, 0.6) // (0x808080, 0.2)
	this.line.iCol = colors.length; colors.push(this.line); colors.push(this.line); colors.push(this.line)
	this.mLine = new THREE.LineBasicMaterial({ color: 0x808080 }) // lineWidth: does not work :(   ++ No iCol!

	this.rotSS = this.ds(0xff0000) //     2                         3                         4                         5                        6   Seiten vom Würfel
	this.green = this.ds(0x00ff00); colors.push(this.green); colors.push(this.green); colors.push(this.green); colors.push(this.green); colors.push(this.green)
	this.yellow = this.ds(0xffFF00); colors.push(this.yellow); colors.push(this.yellow); colors.push(this.yellow); colors.push(this.yellow); colors.push(this.yellow)
	this.red = this.ds(0xff0000); colors.push(this.red); colors.push(this.red); colors.push(this.red); colors.push(this.red); colors.push(this.red)
	this.blue = this.ds(0x0000ff); colors.push(this.blue); colors.push(this.blue); colors.push(this.blue); colors.push(this.blue); colors.push(this.blue)
	this.grey = this.ds(0x808080); colors.push(this.grey); colors.push(this.grey); colors.push(this.grey); colors.push(this.grey); colors.push(this.grey)
	this.grey1 = this.ds(0x606060, 1.0)
	this.black = this.ds(0x000000)
	this.black1 = this.ds(0x000000, 1.0)
	this.blackT = this.ds(0x000000, 0.2) // transparent

	this.dgruen = this.ds(0x008000)
	this.hgruen = this.ds(0x80ff80, 1.0)
	this.dblau = this.ds(0x000080)
	this.white = this.ds(0xffFFff)
	this.white1 = this.ds(0xffFFff, 1.0)
	this.bright = this.ds(0xc0c0c0)
	this.grey_root = this.ds(0x808080)
	this.sky = this.ds(0x00BFFF)  //	deep sky blue 	#00BFFF 	(0,191,255)
	this.no_osm = this.ds(0xff99ff)

	/**
			this.dunkel      = this.ds(0x404040)
			this.hell        = this.ds(0xc0c0c0)
			this.drot        = this.ds(0x800000)
			this.hrot        = this.ds(0xff8080)
			this.hblau       = this.ds(0x8080ff)
			this.hgelb       = this.ds(0xffFF88)
			this.sienna      = this.ds(0xA0522D)
	**/

	this.raceway = this.ds(0xffC0CB, 1.0)
	this.motorway = this.ds(0xe892a2, 1.0)
	this.trunk = this.ds(0xf9b29c, 1.0)
	this.primary = this.ds(0xfcd6a4, 1.0)
	this.secondary = this.ds(0xf7fabf, 1.0)
	this.footway = this.ds(0xff8080, 1.0)

	// https://github.com/gravitystorm/openstreetmap-carto
	// http ://www.rapidtables.com/web/color/RGB_Color.htm

	this.allotments = this.ds(0xeecfb3)
	this.cemetery = this.ds(0xaacbaf)
	this.orchard = this.ds(0xaedfa3)
	this.commercial = this.ds(0xF2DAD9)
	this.construction = this.ds(0xc7c7b4) // also brownfield
	this.farmland = this.ds(0xfbecd7) // Lch(94,12,80) (Also used for farm)
	this.farmyard = this.ds(0xf5dcba)
	this.forest = this.ds(0xadd19e)
	this.grass = this.ds(0xcdebb0)
	this.landfill = this.ds(0xb6b592)
	this.industrial = this.ds(0xEBDBE8)
	this.park = this.ds(0xc8facc)
	this.park = this.ds(0xcdebb0) //???
	this.parking = this.ds(0xf7efb7)
	this.garages = this.ds(0xdfddce)
	this.pitch = this.ds(0x80d7b5)
	this.quarry = this.ds(0xc5c3c3)
	this.playground = this.ds(0xDdFbC0) // @playground: lighten(@park, 5%);  water_park
	this.residential = this.ds(0xe0dfdf)
	this.retail = this.ds(0xFFD6D1)
	this.societal_am = this.ds(0xf0f0d8) // @societal_amenities
	this.school = this.ds(0xf0f0d8) // darken(@societal_amenities=#f0f0d8, 70%)  = e0e0c8 kindergarten,college,university
	this.track = this.ds(0x996600)
	this.land = this.ds(0xf2efe9) // @land-color;
	this.water = this.ds(0xb5d0d0) // @water-color;  [waterway = 'riverbank']::waterway
	this.waterB = this.ds(0xb5d0ff) // Mehr Blau!
	this.mud = this.ds(0x2c6396) // @wetland-text: darken(#4aa5fa, 25%); /* Also for marsh and mud */
	this.bare_ground = this.ds(0xeee5dc) // shingle
	this.heath = this.ds(0xd6d99f)
	this.forest = this.ds(0xadd19e)
	this.sand = this.ds(0xf5e9c6)
	this.scrub = this.ds(0xb5e3b5)
	this.bridge = this.ds(0xB8B8B8)

	this.airport = this.ds(0xe9e7e2) // = aerodrome
	this.apron = this.ds(0xe9d1ff)
	this.aeroway = this.ds(0xb0b0c0) // @aeroway-fill: #bbc;
	this.rest_area = this.ds(0xefc8c8)


	this.pl_o_worship = this.to(0xcdccc9)
	this.steps = this.ds(0xFA8072) // Stufen => footway-fill => salmon => #FA8072

	this.amenity_brown = this.ds(0x734a08)	// atm,bank,bar,cafe,tourism_artwork,cinema,nightclub,fire_station,fountain,ice_cream,... default!


	//	if(THREE.REVISION>83)
	this.cTree = [this.amenity_brown, this.green, this.red, this.red]   // cyl needs 3 colors: tube,top,bottom
	//	else
	//	  this.cTree     = new THREE.MultiMaterial( [ this.amenity_brown, this.green, this.red, this.red] ) // cyl needs 3 colors: tube,top,bottom
	this.cTree.iCol = colors.length
	colors.push(this.amenity_brown)
	colors.push(this.green)

	this.box3 = [this.green, this.green, this.green, this.green, this.green, this.green,
	this.yellow, this.yellow, this.yellow, this.yellow, this.yellow, this.yellow,
	this.red, this.red, this.red, this.red, this.red, this.red,
	this.grey] //    2            3            4            5            6      one colour per box side!
	this.box3.iCol = colors.length
	colors.push(this.green) // Green cube of traffic lights
	colors.push(this.green)
	colors.push(this.green)
	colors.push(this.green)
	colors.push(this.green)
	colors.push(this.green)
	colors.push(this.yellow) // Yellow cube of traffic lights
	colors.push(this.yellow)
	colors.push(this.yellow)
	colors.push(this.yellow)
	colors.push(this.yellow)
	colors.push(this.yellow)
	colors.push(this.red) // Red cube of traffic lights
	colors.push(this.red)
	colors.push(this.red)
	colors.push(this.red)
	colors.push(this.red)
	colors.push(this.red)

	colors.push(this.blue) // color error?
	colors.push(this.blue)
	colors.push(this.blue)
	colors.push(this.blue)
}


Style.prototype.ss = function (col) {
	var
		mat = new THREE.MeshLambertMaterial({ color: col, side: THREE.BackSide }) //?? SideL ??
	mat.iCol = colors.length
	colors.push(mat)
	return mat
};

Style.prototype.ds = function (col, opa, black) {
	if (!opa) opa = OPAC
	if (gCustom == 1) { if (black) col = 0; else col = 0xFFffFF }
	var tra = !stereoOn && opa < 1.0
	var
		mat = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, transparent: tra, opacity: opa })
	mat.iCol = colors.length
	colors.push(mat)
	return mat
};

Style.prototype.to = function (col, opa, black) {
	if (!opa) opa = OPAC
	if (gCustom == 1) { if (black) col = 0; else col = 0xFFffFF }
	var tra = !stereoOn && opa < 1.0 && false
	var
		mat = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, transparent: tra, opacity: opa })
	mat.iCol = colors.length
	mat.name = col
	colors.push(mat)
	return mat
};

// MeshLambertMaterial  NICHT reflektierend
// MeshPhongMaterial    Heller - reflektierend

///////////////////////////////////////////



export function NodeGeo() {
	this.geometry = undefined
	return this
}

NodeGeo.prototype.geo = function (geometry) {
	this.geometry = geometry
	return this
}

NodeGeo.prototype.shape = function (points) {
	var shape = new THREE.Shape(points);
	this.geometry = new THREE.ShapeGeometry(shape)
	return this
}

NodeGeo.prototype.plane = function (b, h) {
	this.geometry = new THREE.PlaneGeometry(b, h, 1, 1)
	return this
}

NodeGeo.prototype.box = function (w, h, l) {
	this.geometry = new THREE.BoxGeometry(w, h, l) // l <-> h ! ??
	this.geometry.groups = []
	return this
}

NodeGeo.prototype.cyl = function (t, b, h, s, id) {
	if (!s) s = 16
	this.geometry = new THREE.CylinderGeometry(t, b, h, s)
	this.geometry.groups = []
	if (id) {
		this.geometry.osmID = id
		alert("prototype.cyl id: " + id)
	}
	return this
}

NodeGeo.prototype.sph = function (r, s) {
	if (!s) s = 8
	this.geometry = new THREE.SphereGeometry(r, s)
	this.geometry.groups = []
	return this
}

//NodeGeo.prototype.tet = function (r, id) {
//	this.geometry = new THREE.TetrahedronBufferGeometry(r, 0)
//	this.geometry.osmID = id
//	return this
//}

NodeGeo.prototype.trans = function (x, y, z) {
	var m = new THREE.Matrix4().makeTranslation(x, y, z) // x,y,z = ost/rechts,hoch/oben,süd/hinten
	this.geometry.applyMatrix4(m)
	return this
}

NodeGeo.prototype.scale = function (x, y, z) {
	if (!y) y = x
	if (!z) z = x
	var m = new THREE.Matrix4().scale(new THREE.Vector3(x, y, z))
	this.geometry.applyMatrix4(m)
	return this
}

NodeGeo.prototype.try2 = function (y) {		// half of the height
	var m = new THREE.Matrix4().makeTranslation(0, y / 2, 0)	// x,y,z = ost/rechts,hoch/oben,süd/hinten
	this.geometry.applyMatrix4(m)
	return this
}

NodeGeo.prototype.rotx = function (a) {
	var m = new THREE.Matrix4().makeRotationX(g(a))
	this.geometry.applyMatrix4(m)
	return this
}

NodeGeo.prototype.roty = function (a) {
	var m = new THREE.Matrix4().makeRotationY(g(a))	// positiv ist GEGEN den Uhrzeigersinn (von oben gesehen)
	this.geometry.applyMatrix4(m)
	return this
}

NodeGeo.prototype.rotyr = function (a) {
	var m = new THREE.Matrix4().makeRotationY(a)
	this.geometry.applyMatrix4(m)
	return this
}

NodeGeo.prototype.rotz = function (a) {
	var m = new THREE.Matrix4().makeRotationZ(g(a))
	this.geometry.applyMatrix4(m)
	return this
}

NodeGeo.prototype.merge = function (other, mati) {
	if (!mati) mati = 0
	//this.geometry.merge(other.geometry, undefined, mati)
	this.geometry = BufferGeometryUtils.mergeGeometries([this.geometry, other.geometry], false)
	return this
}

NodeGeo.prototype.mergeto = function (to) {
	//to.geometry.merge(this.geometry)
	to.geometry = BufferGeometryUtils.mergeGeometries([to.geometry, this.geometry], false)
	return this
}

NodeGeo.prototype.maps = function (material, x, z, y, receive, cast) { // Only mesh or place on Master-Map by X/Y
	//	if(FilterType>1 && this.filter) material = FilterMaterial ??
	var mesh = new THREE.Mesh(this.geometry, material)
	mesh.position.x = x
	mesh.position.z = z
	mesh.position.y = y
	mesh.receiveShadow = receive
	mesh.castShadow = cast
	mesh.name = "NodeGeo"
	if (x || z) // position given: show om root-"maps"
		//sh.osm = node
		maps.add(mesh)
	return mesh
}

NodeGeo.prototype.node = function (material, node, receive, cast) { // Place on Map by NODE
	if (cast === undefined) cast = shadow
	if (receive === undefined) receive = shadow
	if (FilterType > 1 && node.filter) material = FilterMaterial
	var mesh = new THREE.Mesh(this.geometry, material)


	mesh.position.x = node.x
	mesh.position.y = node.GetLLm()
	mesh.position.z = node.z
	mesh.receiveShadow = receive
	mesh.castShadow = cast
	mesh.osm = node
	mesh.name = "NodeGeo:" + node.id
	addMore(mesh) //map.more.add(mesh)
	node.mesh = mesh
	return mesh
}

NodeGeo.prototype.nodes = function (material, node, receive, cast) { // Place on Map by NODE
	alert("WEGüüüNodeGeo.prototype.nodes")
	if (cast === undefined) cast = shadow
	if (receive === undefined) receive = shadow
	if (FilterType > 1 && node.filter) material = FilterMaterial
	var mesh = new THREE.Mesh(this.geometry, material)

	mesh.position.x = node.x
	mesh.position.y = node.GetLLm()
	mesh.position.z = node.z
	mesh.receiveShadow = receive
	mesh.castShadow = cast
	mesh.osm = node
	mesh.name = node.id
	maps.add(mesh) // Root-map!
	node.mesh = mesh
	return mesh
}




///////////////////////////////////////////////////////////////////////////////
////// Klasse: Ding/Map-Renderer //////////////////////////////////////////////
////// Es gibt MAP / Avatar+GPS-Marker=?
///////////////////////////////////////////////////////////////////////////////

export function Ding() {  // Konstruktor
	var lon = 0
	var lat = 0

	partView = GET_ParD("bp", "1") * 1
	this.subView = GET_ParD("sub", 0)
	FilterString = GET_ParD("f", "")
	FilterMaterial = new THREE.MeshLambertMaterial({ color: 0x808080, transparent: false, opacity: 0.20, side: THREE.DoubleSide })
	if (FilterString != "") { // Da ist was zum Filtern
		FilterType = 2 // Transparent
		if (FilterString.substr(0, 1) == '!') {
			FilterType = 1 // Marker
			FilterString = FilterString.substr(1)

		}
		if (FilterString.substr(0, 1) == '+') {
			FilterType = 3 // Shape
			FilterString = FilterString.substr(1)
			FilterMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, wireframe: true, wireframeLinewidth: 1 });
		}
	}

	if (FilterType == 2) set_shadow(false)


	// Globale Variablen sind noch mehr Pfui als Konstatnen //////////////////////////

	reset_osmBuilder()

	scene.add(maps)  // Map ist in Metern (nicht GPS-Grad) Nullpunkt ist was? NICHT Greenwitch oder Equator, immer noch Lade-Relativ, aber irgendwann mit Nachladen!
}



function AvatarsDo(xchg) { //                                  0:ID  1:date_time    2:on 3:lat=x 4:lon=-z 5:ele=y 6:ay 7:ax? 8:v   9:secs 10:usrname?
	// pos|1;2017-03-26 09:04:53;1;1.000;2.000;3.000;4.0;5.0;6.000;0|2;2017-03-26 09:01:58;1;49.7150;11.08700;10.0000;0.00;-10.0;0.000;175|
	var list = xchg.split("|")
	list.shift()
	for (var u in list) {
		var vals = list[u].split(";")
		//	if( vals.length < 10 ) continue
		var id = vals[0] * 1
		if (id == 0) { // chat
			if (vals[2] == "1") {
				var chatNew = vals[3]
				if (chatLast != chatNew) {
					chatLast = chatNew

					if (chatNew.length > 60) {
						var split = chatNew.indexOf(" ", 60 - 5);
						if (split > 0) {
							var tex1 = chatNew.substring(0, split)
							chatNew = chatNew.substring(split)
							chat3 = chat2
							chat2 = chat1
							chat1 = chat0
							chat0 = tex1
						}
					}

					chat3 = chat2
					chat2 = chat1
					chat1 = chat0
					chat0 = chatNew
					if (hud) if (hud.Out) hud.Out([chat3, chat2, chat1, chat0])
				}//new Text
			}//aktiv"1"
			continue
		}//id=0

		if (!avatars[id]) { // create new avatar
			var mesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32), cEye)
			mesh.castShadow = shadow
			mesh.rotation._order = "YXZ"

			var node = new Node(0, 0, 0)
			node.AddTag("User name", vals[10])
			mesh.osm = node

			var geoLine = new THREE.BufferGeometry(); var vertices = []
			vertices.push(new THREE.Vector3(0, 0, 0));
			vertices.push(new THREE.Vector3(0, 1000, 0));
			var maLine = new THREE.LineBasicMaterial({ color: 0xffFF00 })
			geoLine.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
			var mLine = new THREE.Line(geoLine, maLine);
			mLine.rotation._order = "YXZ"
			mesh.add(mLine)

			avatars[id] = mesh
			scene.add(mesh)

		}
		var a = avatars[id]
		if (id == userID) {
			a.visible = false
			continue
		}
		a.position.x = GetLon2x(vals[4] * 1, vals[3] * 1)
		a.position.z = GetLat2z(vals[3] * 1) // -z
		a.position.y = vals[5] * 1  // m
		a.rotation.z = g(vals[7] * 1)
		a.rotation.y = g(vals[6] * 1 + 90) // grad=>rad
		a.children[0].rotation.z = -g(vals[7] * 1) // Beam must not look down

		var on = (vals[2] == "1")
		a.visible = on

		var dis = (a.position.x - camera.position.x)
			+ (a.position.z - camera.position.z)
		a.children[0].visible = (Math.abs(dis) > 250)
	}
}



function ReplayUpdate(dt) {

	//// AS times gos by ////
	if (gAviation) var d = dt * 1 //
	else var d = dt * 5 // GO-Log-Takt
	if (keyShift) {
		d *= 7	// zeitraffer
		if (keyAlt) d *= 7  // stärker
	}
	else if (keyAlt) d = 0 // Stop
	if (d > 1) d = 1	// max 1 Sekunde
	replayI += d


	//// frame cycle ////
	if (replayLast != Math.floor(replayI)) {
		var line = replay[Math.floor(replayI)]
		var ii = Math.floor(replayI)
		var line = replay[ii]
		if (!line) { set_replayI(-2); replayLast = -2; alert("replay END (index)"); return }
		if (line.length < 22) { set_replayI(-2); replayLast = -2; alert("replay END (line)"); return }

		if (!gAviation) { //// OSMGO

			var l = line.split(";")
			//                   0 1         2         3      4   5     6     7        8      9    10
			// 2017-06-03 17:57:11;1;48.196042;11.810881;101.00;0.000;-10.0;0.000;46979831;myname;loging
			var X = GetLon2x(l[3], l[2])
			var Z = GetLat2z(l[2])
			var Y = l[4] * 1
			var V = l[6] * 1
			var D = -l[5] * 1
			var S = 0
			hud.Out([l[10], replay.length.toString(), Math.floor(replayI)])
		}//GO

		else { //// AVIATION
			var l = line.split(",")
			while (l[0] == "GPGSA" || l[0] == "GPGSV") {
				replayI += 1
				line = replay[Math.floor(replayI)]
				l = line.split(",")
			}

			replayI += 1 // Ramm-recording ist: Ein Satz pro Sekunde
			var lin2 = replay[Math.floor(replayI)] // Eigendlich ist das die erste Zeile!
			if (!lin2) {
				set_replayI(-2); alert("replay END (lin2)"); return
			}

			var m = lin2.split(",")
			// 0      1          2 3        !4 5         !6 7    8!!   9      10  11 12
			// $GPRMC,HHMMSS.uuu,A,BBBB.BBBB,b,LLLLL.LLLL,l,GG.G,RR.R ,DDMMYY,M.M,m,F*PP
			// $GPRMC,082832.000,A,4934.9869,N,01052.9761,E,0.00,12.78,010618,   , ,D*51

			// $GPGGA,082833.000,4934.9869  ,N,01052.9761,E,   2,    9,  0.85,326.7,M,47.9,M,0000,0000*58
			// $GPGGA,HHMMSS.ss ,BBBB.BBBB  ,b,LLLLL.LLLL,l,   Q,   NN,   D.D,H.H,h,G.G,g,A.A,RRRR*PP
			// 0      1          2           3 4          5    6     7      8 9!  10 1112 113 14
			var la = DDMM2D(l[3] * 1); if (l[4] == "S") la *= -1
			var lo = DDMM2D(l[5] * 1); if (l[6] == "W") lo *= -1
			var h = m[9] * 1 - 325; if (h < 1.5) h = 1.5

			var X = GetLon2x(lo, la)
			var Z = GetLat2z(la)

			var Y = h  						// ToDo: Höhe Flughaven beim GO merken
			var minus = h / 20; if (minus > 30) minus = 30
			replayG = (replayG * 9 + replayDY) / 10  // Glättung
			var V = replayG * 8 - minus     // v vorwärz-startgeschwindigkeit*faktor - also nach unten, etwas

			//			var U = l[7]-100//; if(U<0) U=0
			//			var V = U //-15   // v vorwärz-startgeschwindigkeit*faktor - also nach unten, etwas

			var S = replayDD * 2	// je mehr Kurvenflug desto schräger
			var D = l[8] * 1					// Direction

			if (Y < 6.0) {
				S = 0 // Am Boden keine Schräglage
				V = -15
			}

			hud.Out(["Log:" + (replay.length - Math.floor(replayI)) + " - " + nodeCount
				, "Tim:" + l[1].substring(0, 2) + ":" + l[1].substring(2, 4) + ":" + l[1].substring(4, 6)
				, "Pos:" + la.toFixed(6) + "/" + lo.toFixed(6)
				, "Ele:" + (m[9] * 1).toFixed(1) + "(" + h.toFixed(1) + ")m  -  V:" + l[7] * 1 + "m/s"
				//	,l[7] +"  #  "+ U +"  #  "+ V
				//	,"D: "+D +"  *  "+ replayDD+"  #  " + S
			])

		} //AVI

		// Eckpunkte für Inerpolation merken
		replayDX = X - replayX; replayX = X
		replayDZ = Z - replayZ; replayZ = Z
		replayDY = Y - replayY; replayY = Y
		replayDV = V - replayV; replayV = V
		replayDS = S - replayS; replayS = S
		replayDD = D - replayD; replayD = D
		if (replayDD > +180) replayDD -= 360	// Wenn es mehr als 180 Grad sind
		if (replayDD < -180) replayDD += 360	// dreht es sich bestimmt in die andere Richtung weniger
	}//frame-cycle


	// Next second value minus delta interpoliert
	var rdt = 1 - (replayI - Math.floor(replayI))  // Rmaining time to the next full secound
	camera.position.x = replayX - replayDX * rdt
	camera.position.z = replayZ - replayDZ * rdt
	camera.position.y = replayY - replayDY * rdt
	camera.rotation.x = g(replayV - replayDV * rdt)
	camera.rotation.z = -g(replayS - replayDS * rdt)
	camera.rotation.y = -g(replayD - replayDD * rdt)

	replayLast = Math.floor(replayI)
}//ReplayUpdate



var seconds = 0
var secondL = 0
var secondX = 0
var posLast = ""

Ding.prototype.update = function (dt) {
	seconds += dt
	secondL += dt
	secondX += dt
	if (camera === undefined) return

	var lon = camera.Lon()
	var lat = camera.Lat()


	if (Number.isNaN(lat) || Number.isNaN(lon)) {
		lat = 0; lon = 0
		console.log("NaN lat lon") // or alert
	}

	var dir = r(camera.rotation.y)
	var view = r(camera.rotation.x)

	if (dt > 30.000) alert("You have been logged off.\nRunning in the backround?")



	if (hud) if (hud.gFps > hud.fpsMin + 0 && secondX > 0.2 && gCustom != 2) {  // + 8
		secondX = 0

		if (userID > 0) { // Zyklisch eigenes zum Server senden und Andere bekommen

			var pos = lat.toFixed(8) + ";" + lon.toFixed(8) + ";" + camera.position.y.toFixed(2)
				+ ";" + dir.toFixed(0) + ";" + view.toFixed(0) + ";" + 0.0 // v Geschwindigkeit
				+ ";" + userName

			if (replayLog) {
				if (replayLog.length > 333) set_replayLog(replayLog.substring(0, 333))
				pos += encodeURI(";" + replayLog); set_replayLog("")
			}

			if (multiplay) {
				var userID0 = 0;
				if (posLast != pos) {
					posLast = pos
					userID0 = userID;
				}
				var xmlhttp = new XMLHttpRequest()
				xmlhttp.onreadystatechange = function () {
					if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)) {
						if (cEye.map)
							AvatarsDo(xmlhttp.response)
					}
				}
				xmlhttp.open("GET", "./xchg.php?pos=" + userID0 + ";" + pos, true) // osmgo.org/xchg.php?pos=userID;x;y;z;xr;yr;v
				xmlhttp.send()
			}


		} else { // no user id yet: Login

			if (userID < -1) {
				set_userID(-1)
				var xmlhttp = new XMLHttpRequest()
				xmlhttp.onreadystatechange = function () {
					if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)) {
						var res = xmlhttp.response
						if (res.length > 199) res = "1;karlos;user/X5"
						res = res.split(";")
						set_userID(res[0])
						if (res.length > 1) set_userName(res[1])
						if (dbg > 0) log("!!2!!" + strGET.replace("&", "§"))
						if (simul) {
							set_userSet(true)
							set_userName("karlos");
							//stateCity = "ForchHeim"
						}
						if (res.length > 2) {
							//stateCity = res[2]
						}
						if (res.length > 3) {
							MapillaryID = "&access_token=" + res[3] // "&client_id="
						}

					}//http received
				}//http done

				var url = "./login.php?username=" + userName + "&lat=" + latitude + "&lon=" + longitude
				var llName = GET_Par("name")
				if (llName) url += ("&name=" + llName)
				xmlhttp.open("GET", url, true)
				xmlhttp.send()
			}
		}// userid?

	}//>200ms?


	if (secondL > 2) {
		secondL -= 2

		/**	if(lowDome) { // lll
						scene.remove(lowDome)
				lowDome = undefined

				//if(hud.gFps>30 && tileDistMax<16)	tileDistMax++
				//if(hud.gFps<20)	tileDistMax--
			}***/

		if (!lowDome && lastLoadz < 9e9) {
			setDome()
		}


		if (hud) hud.Fps()

		//var s =      + lat.toFixed(8) +"/"+  lon.toFixed(8) +"/"+ camera.position.y.toFixed(1)
		//	    +  "_" + dir.toFixed(0) +"/"+ view.toFixed(0) +" +"+ (seconds/30).toFixed(0)*30

		var sec = Math.floor(seconds)
		if (hud
			&& (gCustom != 2)
			// (userSet)
		) {

			if (chat1 == "") {

				if (sec == 6) {
					if (control.controlMode == 3) hud.Out(["FLIGHT-Mode", "ARROW-KEYS: left/right-turn, ahead/back", " - - - - ", "Press 'x' to change to VIEW- or SEGWAY-Mode", "'F1' for help"])
					else hud.Out(["Press 'x' to change to SEGWAY, FLIGHT or VIEW-Mode", "'F1' for help"])
				}

				if (sec == 16) hud.Out([""])
				//(sec== 50)					hud.Out(["If you like to comment","please press 'C' for 'Chat'.","Please add your OSM-Name"," - - - - ","'F1' for help"])
				//(sec== 30) if(control.kmt==0)	hud.Out(["Use keyboard, mouse","or touchscreen","to move or look around","'F1' for help"])
				//(sec==300)					sendMail() //hud.Out(["5 Minutes online","Do you like it?","press 'C' to send a comment"])
				//(sec==600)					hud.Out(["Hi! Do you like this?","Please mail me:","karlos@OSMgo.org"])

			}


			if (sec == (3 * 60) && userName != "karlos") { // 90

				var url = "./mail.php?username=" + userName + "&lat=" + lat + "&lon=" + lon
				console.log("url -----------------------------------", url)
				var xmlhttp = new XMLHttpRequest()
				xmlhttp.open("GET", url, true)
				xmlhttp.send()
				// Or this way?:  https://stackoverflow.com/questions/7381150/how-to-send-an-email-from-javascript

				// Geht nicht wenn auf Dreambox ein Passwort ist:
				// var
				// 	dbhttp = new XMLHttpRequest()
				// dbhttp.open("GET", "https://zi11.ddns.net:3487/web/message?type=3&timeout=6&text=GO 2 Minuten: " + stateCity, true)
				// dbhttp.send()
			}

			if (sec == (5 * 60)) {
				// hud.Out(["5 Minutes online","Do you like it?","press 'r' to send a comment"])
				if (confirm("5 Minutes online! Would you send me your experience?") == true)
					sendMail()	// else window.close_or_crash()
			}
		}


	}

	if (hud) hud.Update(dt, seconds, -camera.rotation.y)

	// if ((osmDo == 0) && lalo0) {
	// 	if (hud) hud.Out(["Detecting location", "Else: Go to London"])
	// }

	if ((osmDo == 0) && lalo0 && (seconds > 10)) {
		set_gpsOn(false) // GPS-Simulation
		set_lalo(
			// default london
			51.50716135,  // 51.508
			-0.12781402  // -0.094//7311
		)
		reset_lalo0()
		var tiles = 4 // hier nicht so viel
	}

	if ((osmDo == 0) && !lalo0) {  // Position ist bekannt und OSM-Lessen ist noch anzustoßen
		set_osmDo(1)
		osmBuilder.QueryOsmTiles(longitude, latitude)
		set_teststr('Read OSM-Data')
		if (mLogo) if (mLogo) mLogo.visible = true
		/**
		if(seconds>10)
			 writeLogLine("OSMgo:"+strGET+"&name=Default_London")
		else writeLogLine("OSMgo:"+strGET+"|&lon="+longitude+"&lat="+latitude)
		**/
	}

	if (tileLoading) if (mLogo) mLogo.rotation.y += g(0.3) // osmDo==1

	if ((osmDo == 1) && osmBuilder.IsOsmDataAvail()) { // Overpass-Abfrage/OSM-Laden ist fertig

		if (nodeCount > 150000 && dbg != 1.5) {			 // ccc ccc
			ResetTiles()
			osmBuilder.QueryOsmTiles(longitude, latitude)
		}


		if (!gpsAct) { // Beim GPS-Start und -Aktuell je eine Kugel. Avatar: Kegel/Segway/Maskoc
			// log("posX0+"+posX0+"+"+posZ0)
			var mash = new NodeGeo().sph(0.2).maps(mlm.grey_root, posX0, posZ0, 0.5).name = "GPS-Aktuell"
			gpsAct = new NodeGeo().sph(0.2).maps(mlm.grey_root, posX0, posZ0, 0.4).name = "GSP-START"
			// ää??? Nur die Farben die hier (auf Main-Map) verwendet werden sind später mit (zu viel) Schatten! ???

			ModelPlace(-1, "server", "segway", 0, 0, "obj")		// avatar
		}

		set_osmDo(2)
		return // Nicht gleich weiter, damit es Angezeit wird
	}

	if (osmDo == 2) {
		if (osmBuilder.readJsonData()) return // Noch nicht fertig
		//  osmBuilder.readJsonData()  // Echte Daten

		if (relFirst) relNeLa = relFirst
		if (wayFirst) wayNeLa = wayFirst
		if (nodeFirst) set_nodeNeLaP(nodeFirst)
		dtCount = 0
		for (var i in ways) ways[i].Analyse() // Die OSM-Daten analysieren, filern, vorbereiten

		var material = mlm.floor2 // land
		if (FilterType > 1) material = FilterMaterial

		var latIndexL = tileLoading.latIndex
		var lonIndexL = tileLoading.lonIndex
		var p = Math.pow(2, diffLevel)
		//???	if(gCustom!=3)  // 3=Garage UND? anderer Server?!!?
		for (var ta = 0; ta < p; ta++) {// alle View-Tile in der Load-Tile: Ggf. neu Anlegen.
			for (to = 0; to < p; to++) {
				var state = 3  // 0=Canel? 1=toLoad&show. (?2=loading) 3=Visible. 4=Hidden
				var latIndexV = latIndexL * p + ta
				var lonIndexV = lonIndexL * p + to
				if (!viewTiles[latIndexV]) { viewTileMake(latIndexV, lonIndexV); state = 4 }
				if (!viewTiles[latIndexV][lonIndexV]) { viewTileMake(latIndexV, lonIndexV); state = 4 }
				var viewTile = viewTiles[latIndexV][lonIndexV]
				viewTile.floor.material = material
				viewTile.state = state
				if (state == 4) viewTile.map.visible = false
			}
		}
		set_osmDo(3)
		return
	}

	if (replayI >= 0) ReplayUpdate(dt) // Immer, aber hier?

	if (osmDo == 3) { // All Relations
		if (this.osmRelations(dt)) return // Noch nicht fertig
		set_osmDo(4)
		return
	}

	if (osmDo == 4) { // All ways
		if (dt < 0.500) dtCount = 0
		if ((dt > 0.500) && (dbg <= 3)) dtCount++

		if (dtCount < 5) { // x mal 50ms=20FPS 125ms = 8 PFS    ODER viele Debug-Ausgaben
			// Solange nicht überlastet: Mehr Rendern
			if (this.osmWays(dt)) return // Noch nicht fertig
		} else log("x times  dt gross! " + dt)
		set_osmDo(5)
		return
	}

	if (osmDo == 5) { // All Nodes
		if (this.osmNodes(dt)) return // Noch nicht fertig
		set_osmDo(6)
		return
	}

	if (osmDo == 6) {
		// if( this.osmNodes(dt) ) return // Noch nicht fertig
		if (dbg > 2) log("  render END " + new Date().toLocaleTimeString())
		set_teststr('OSM ok ')
		//	if(mLogo) mLogo.visible = false
		// pppppppp if(!pack) pack = new Packman()

		if (FilterArray.length > 0) {
			if (FilterCount != FilterArray.length) {
				FilterCount = FilterArray.length
				if (!tileLoading) alert("Filter: " + FilterString + " " + FilterArray.length)
			}
		}
		if (FilterType == 1) {
			for (var f in FilterArray) {
				var osm = FilterArray[f]

				var geometry = new THREE.CylinderGeometry(5, 0, 100, 3)
				var mesh = new THREE.Mesh(geometry, mlm.yellow)
				mesh.osm = osm
				if (!(osm.idWay >= 0))
					osm = nodes[osm.wayNodes[0]]	// way? 1. Node davon merkieren
				mesh.position.x = osm.x
				mesh.position.z = osm.z
				mesh.position.y = 100 / 2
				add_Map(mesh, osm.id)
			}
		}

		set_osmDo(7)
		var matCo = colors;	//if(THREE.REVISION<=83)
		var material = mlm.floor2
		if (FilterType > 1) material = FilterMaterial

		if (tileLoading.state == 2) {
			tileLoading.state = 3

			var latIndexL = tileLoading.latIndex
			var lonIndexL = tileLoading.lonIndex
			var p = Math.pow(2, diffLevel)
			for (var ta = 0; ta < p; ta++) {
				for (var to = 0; to < p; to++) {
					var latIndexV = latIndexL * p + ta
					var lonIndexV = lonIndexL * p + to
					var viewTile = viewTiles[latIndexV][lonIndexV]
					viewTile.floor.material = material
					//	viewTile.m geo.computeVertexNormals(); // Farbuebergaenge weich, weil das beim Modell von Alex fehlt

					if (viewTile.map_Geos.length == 0) { err("merge map"); }
					else {
						var geometry = BufferGeometryUtils.mergeGeometries(viewTile.map_Geos, false)
						geometry.name = "# mGeo #" + latIndexV + "/" + lonIndexV
						//	if(gOptimize>1) m geo = new THREE.BufferGeometry().fromGeometry(viewTile.mg eo)
						const material = new THREE.MeshLambertMaterial({
							vertexColors: true,
							side: THREE.DoubleSide,
							//color: 0xb0b0b0,
						});
						var mesh = new THREE.Mesh(geometry, material) //, mlm.blue)// matCo)
						mesh.receiveShadow = shadow
						mesh.castShadow = shadow
						viewTile.map.add(mesh)     // Mesh for viewTile super-geometry
					}

					if (viewTile.oth_Geos.length == 0) { err("merge more"); }
					else {
						var geometry = BufferGeometryUtils.mergeGeometries(viewTile.oth_Geos, false)

						geometry.name = "# oGeo #" + latIndexV + "/" + lonIndexV
						const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
						var more = new THREE.Mesh(geometry, material) // matCo)
						more.receiveShadow = shadow
						more.castShadow = shadow
						viewTile.map.more.add(more) // Mesh for more super-geometry
					}

				}
			}
		}
		set_tileLoading(false)
		//????	if(gCustom!=3) // Garage &?& anderer Server?
		osmBuilder.LoadOsmTiles() // check for more to load
		if (osmDo == 7) {
			log("- - Overpass done - -", buildingParts)
			if (mLogo) mLogo.visible = false
		}
		return
	}// ==6

	if (osmDo == 7) {

		if (ModelDelete.length > 0) {
			var nr = ModelDelete[0]
			var re = nr - 10000000000
			if (re > 0) {  //// REL
				if (rels[re]) {
					var rel = rels[re]
					if (rel.Visible(false))
						ModelDelete.shift()
				}//way
			}

			else if (nr > 0) {  //// WAY
				if (ways[+nr]) {
					var way = ways[+nr]
					if (way.mesh) way.mesh.visible = false
					ModelDelete.shift()
				}//way
			}//+way

			else {  //// NODE
				if (nodes[-nr]) {
					var node = nodes[-nr]
					if (node.mesh) node.mesh.visible = false
					ModelDelete.shift()
				}//rel
			}//-node
		}//>0
		else {
			set_osmDo(8)
		}
		return
	}


	if (osmDo == 8) {
		if (Houses.length > 0) {
			NodeHouse(Houses[0])
			Houses.shift()
		}
		else set_osmDo(9)
	}


	if (osmDo == 9) {
		set_osmDo(11)
		if (keepDo) {
			var dLat = 1000 / LAT_FAKT;
			keep.LoadAndPlace((longitude - dLat).toFixed(8)		// left
				, (longitude + dLat).toFixed(8)		// right
				, (latitude - dLat).toFixed(8)     	// bottom
				, (latitude + dLat).toFixed(8))		// top_
		}

	}



	if (osmDo >= 9) {  // Fertig: nur updates (gibts nicht beim Renderer)
		if (mLogo) mLogo.rotation.y += g(-0.3)
		//ppppppppp if(pack) pack.Play(seconds)
	}

}



Ding.prototype.osmNodes = function () { // aus OSM-Struktur wird TREEjs (interne Funktion von ...)

	if (hud) if (hud.gFps < (hud.fpsMin + 0)) return true;

	// Alle OSM-Nodes plazieren
	var countdown = maxDT // s =   15ms+Reserve ~ 16.666ms = 1000/16.666 = 60 FPS
	var dt = 0
	while (countdown > 0) {
		if (nodeNeLaP)
			nodeNeLaP.Place()
		if (!nodeNeLaP.next)
			return false // nicht weiter, fertig
		set_nodeNeLaP(nodeNeLaP.next)
		dt = clock.getDelta()
		countdown -= dt
	}
	return true // weiter

}



Ding.prototype.osmWays = function () { // aus OSM-Struktur wird TREEjs (interne Funktion von ...)

	// Alle OSM-Ways plazieren (ways sind ist Highway und Building und ...)
	// var s = Math.abs( ((wayCount-wayIndex)/wayCount+0.5)/1.5 )
	if (mLogo) {
		var s = mLogo.scale.x - 0.05
		if (s < 0.2) s = 0.2
		mLogo.scale.x = s
		mLogo.scale.y = s
		//  mLogo.position.y = -0.4 // + s*0.6
	}

	if (!wayNeLa) return false // nothing to render yet
	if (hud) if (hud.gFps < (hud.fpsMin + 2)) return true;

	// Aus OSM-Daten ein 3D-Modell erstellen
	var countdown = maxDT
	var dt = 0
	//log("render::::::: ",wayIndex )
	while (countdown > 0) {
		//log("render- ",wayIndex,dt,countdown)

		wayNeLa.Place()
		if (!wayNeLa.next)
			return false // nicht weiter, fertig
		wayNeLa = wayNeLa.next
		inc_wayIndex()
		dt = clock.getDelta()
		countdown -= dt
	}
	return true // weiter

}




Ding.prototype.osmRelations = function () { // aus OSM-Struktur wird TREEjs (interne Funktion von ...)

	if (hud) if (hud.gFps < (hud.fpsMin + 4)) return true;

	// Alle OSM-Relationen analysieren
	var countdown = maxDT
	var dt = 0
	while (countdown > 0) {
		if (relNeLa)
			relNeLa.Place()
		if (!relNeLa.next)
			return false // nicht weiter, fertig
		relNeLa = relNeLa.next
		dt = clock.getDelta()
		countdown -= dt
	}
	return true // weiter

}


// https://3dwarehouse.sketchup.com/model.html?id=eba1abcbc233133e167e69c6aa163b36
export function ModelPlace(id, server, model, x, z, format) {
	// server: ToDo
	if (dbg > 1) log("***** ModelPlace: ", server, model, x, z, format)
	// if (simul)
	// 	simul = true	//  return

	if (FilterType > 1 && this.filter) return

	var onError = function (xhr) {
		log("onError", xhr);
	};

	var onProgress = function (xhr) {
		if (xhr.lengthComputable) {
			var percentComplete = xhr.loaded / xhr.total * 100;
			if (dbg > 1.6) log(Math.round(percentComplete, 2) + '% downloaded');
		}
	};

	var onLoadedMTL = function (object) {
		if (dbg > 2) log("onLoadedMTL:", object.children)
		for (var c in object.children) {
			var
				mesh = object.children[c]
			mesh.castShadow = shadow
			mesh.receiveShadow = shadow
			if ((id == 4711) || (id == 4717) || (id == -1))
				mesh.geometry.computeVertexNormals(); // Farbuebergaenge weich, weil das beim Modell von Alex fehlt
		}//children

		if (id == -1) {

			var s = 0.6 // 0.015  // mm zu m und größer zum sehen
			object.scale.set(s, s, s)
			object.rotation.y = g(180)
			object.position.z = - 1.954
			set_mesh2Segway(object)
		}
		// else objectLast = object

		if (id == 4903) {  // gCustom==3
			object.rotation.y = g(203)
			object.position.x += 17
			object.position.y += 0.2
			object.position.z += 38
		}

		var s = 1 / 32
		if (id == 4798) object.scale.set(s, s, s)
		if (id == 4798) object.rotation.y = g(45)
		if (id == 4798)
			object.position.x = 2000
		if (id == 4798)
			object.position.z = 20000
		//			object.matrixWorldNeedsUpdate = true
		if (id == 4711) object.rotation.y = g(-101)
		if (id == 4712) object.rotation.y = g(-99) //  Not needed but: Did not work?   London Eye
		if (id == 4713) object.scale.set(0.02, 0.02, 0.02)
		if (id == 4713) object.position.y = 0.4
		if (id == 4713) object.rotation.y = g(-45 + 90)
		if (id == 4716) object.scale.set(1, 1, 1)
		if (id == 4716) object.rotation.y = g(45)
		var s = 2 * 100 / 4
		if (id == 4717) object.scale.set(s, s, s)
		if (id == 4717) object.position.y = s * 0.84
		var s = 2 * 50 / 4
		if (id == 4718) object.scale.set(s, s, s)
		if (id == 4718) object.position.y = s * 0.84

		if (id == 4719) object.scale.set(0.001, 0.001, 0.001)
		if (id == 4719) object.rotation.x += g(-90)

		object.position.x += x
		object.position.z += z
		object.castShadow = shadow
		object.receiveShadow = shadow
		maps.add(object)
	}

	// THREE.Loader.Handlers.add(/\.dds$/i, new DDSLoader()) // nur für OBJ ???

	if (format == "obj") { // && parMdl>0
		var
			mtlLoader = new MTLLoader();
		mtlLoader.setPath('models/');
		mtlLoader.load(model + '.mtl', function (materials) {
			materials.preload()
			var
				objLoader = new OBJLoader()
			objLoader.setMaterials(materials)
			objLoader.setPath('models/')
			//log( "model:",model );
			objLoader.load(
				model + '.obj' // Filename
				, onLoadedMTL
				, onProgress
				, onError
			)//objLoader
		})//mtlLoader
	}//formatOBJ


	if (format == "dae" && parMdl > 0) { //
		map_dae = maps
		var
			loader = new ColladaLoader();
		loader.load(
			'models/' + model + '.dae'	// resource URL
			, function (collada) {
				var chil = collada.scene.children[0].children
				var mesh = chil[0]
				if (chil.length > 1)
					mesh = chil[1]
				mesh.rotation.x = g(-90)
				mesh.rotation.z = g(+90)
				mesh.position.x = x
				mesh.position.z = z
				if (id == 4719) {
					mesh.rotation.z += g(-90)
					mesh.position.z += 0
					mesh.position.x += 14
					mesh.scale.set(0.02, 0.02, 0.02)
				}
				if (id == 4714) {
					mesh.position.x += 60
					mesh.position.y = -1.954
					mesh.position.z += 45
					mesh.scale.x = 0.1
					mesh.scale.y = 0.1
					mesh.scale.z = 0.1
				}
				if (id == 4715) {
					mesh.position.z += 9
					mesh.position.x += 0
					mesh.scale.x = 0.025
					mesh.scale.y = 0.025
					mesh.scale.z = 0.025
				}
				///	 mesh.computeVertexNormals(); // ist kein mesh!
				mesh.castShadow = shadow
				map_dae.add(mesh)
			}// Function when resource is loaded
			, onProgress
		)
	}



}//ModelPlace

