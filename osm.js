import * as THREE from "three";
import {
  camera,
  gCustom,
  GET_Par,
  GET_ParD,
  viewLevel,
  set_viewLevel,
  tileDistMax,
  set_tileDistMax,
  gAviation,
  simul,
  set_simul,
  log,
  err,
  dbg,
  posX0,
  posY0,
  set_posXZ0,
  control,
  lowDome,
  mlm,
  g,
  shadow,
  DrawDelta,
  diffLevel,
  set_osmDo,
  httpx,
  gServer,
  waysMax,
  gOptimize,
  posZ0,
  clock,
  parMdl,
  set_lastLoad,
  lastLoadEx,
  lastLoadx,
  lastLoadz,
  lastLoadEz,
  dbgOsmID,
  dbgReturn,
  dbgRange,
} from "./main.js";
import {
  maps,
  FilterType,
  ModelPlace,
  FilterMaterial,
  colors,
  maxDT,
} from "./render.js";
import { nodes, Node } from "./render_node.js";
import { Way, waysL, set_llPos } from "./render_way.js";
import { Rel, rels } from "./render_rel.js";

import { SinCos, dir, Phytagoras } from "./controls.js";
// import { JSON2 } from './overpass2.js';

export var loadTiles = [[]]; // [latZ][lonX]
export var viewTiles = [[]]; // [latZ][lonX]

export function ResetXTiles() {
  viewTiles = [[]]; // [latZ][lonX]
  loadTiles = [[]]; // [latZ][lonX]
}

// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
export function lon2tileX(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}
export function lat2tileY(lat, zoom) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom),
  );
}
export function tileX2lon(x, zoom) {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}
export function tileY2lat(y, zoom) {
  var n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export var tileLoading = false;
export function set_tileLoading(s) {
  tileLoading = s;
}

var moreMax = GET_ParD("more", 1) * 1;
var wasmState = 0; // 0:NotImplemented 1:vorhanden 2:CodeLadend 3:bereit 4:TileLadne 5:TielGeladenUndVerarbeitet
if (typeof WebAssembly !== "undefined" && GET_Par("wa") * 1) wasmState = 1;

export var LAT_FAKT = 111100; // ist genau genug  111120 = 1.852 * 1000.0 * 60  // 1 NM je Bogenminute: 1 Grad Lat = 60 NM = 111 km, 0.001 Grad = 111 m
var lonFakt = LAT_FAKT;
var initGeoPosLat = 51.50706135; // curGeoPosL
var initGeoPosLon = -0.12781402;

var elementIndex = 0;
var url = "---";

//r tileSizeLa  = 0.002 // 0.005  grad  (0.001=111m)
//r tileSizeLo  = tileSizeLa * 1.5
//r tileDistMax = 4

var latIndexView0;
var lonIndexView0;
var latIndexViewP;
var lonIndexViewP;

var tileTime = undefined;

var expWasm;
var memWasm;

export function GetLon2x(lon, lat) {
  //if(!lat) alert("!lat!")
  lonFakt = LAT_FAKT * Math.cos(Math.abs((lat / 180) * Math.PI));
  var meter = (lon - initGeoPosLon) * lonFakt;
  return Math.floor(meter * 100) / 100; // cm ist genau genug
}

export function GetLat2z(lat) {
  var meter = (initGeoPosLat - lat) * LAT_FAKT;
  return Math.floor(meter * 100) / 100; // cm ist genau genug
} // Grad PLUS = Meter MINUS !! "In den Hintergrund"

export function addLatLon(mesh, lat, lon, roty) {
  var tileX = lon2tileX(lon, viewLevel); // Assuming, that tile exists already by the object, the repository mesh is caused
  var tileY = lat2tileY(lat, viewLevel); // -z
  var ti = viewTiles[tileY][tileX];
  if (!ti) {
    alert("ti.map undefined");
    return;
  }
  var ma = ti.map;
  var latTile = tileY2lat(ti.latIndex + 1, viewLevel); // latIndex*tileSizeLa
  var lonTile = tileX2lon(ti.lonIndex, viewLevel); // lonIndex*tileSizeLo // Tiles sind weg vom Equator schmaler
  initGeoPosLon = lonTile; // Math.floor(lon/tileSizeLo)*tileSizeLo // Tiles sind weg vom Equator schmaler
  initGeoPosLat = latTile; // Math.floor(lat/tileSizeLa)*tileSizeLa
  mesh.position.x = GetLon2x(lon, lat);
  mesh.position.z = GetLat2z(lat);
  mesh.rotation.y = g(roty);
  ma.add(mesh);
}

THREE.PerspectiveCamera.prototype.Lon = function () {
  var lat = -this.position.z / LAT_FAKT + initGeoPosLat;
  lonFakt = LAT_FAKT * Math.cos(Math.abs((lat / 180) * Math.PI));
  return +this.position.x / lonFakt + initGeoPosLon;
};
THREE.PerspectiveCamera.prototype.Lat = function () {
  return -this.position.z / LAT_FAKT + initGeoPosLat;
};

function loadTimeout() {
  // hud.Out(["Tile load Timeout! ("+secs,"s) Press key B to restart"])
  log("Tile load Timeout!" + new Date().toLocaleTimeString());
  // key_B = true
  tileLoading.state = 1; // Load again
  tileLoading = false;
  osmBuilder.LoadOsmTiles(); // check for more to load
}

// +X  longitude = 11.087  +X  ORST = Positiv  WEST = Negativ  <=>  +X_Kamera/WebGL
// -Z  latitude  = 49.715  -Z  NORD = Positiv  SÜD  = Negativ  <=>  -Z_Kamera/WebGL   !! Grad PLUS = Meter MINUS !! "In den Hintergrund"

var loadedData = 0;
var elementsData = [];

export function add2Tile(obj, nodeID) {
  // for root-"maps" no such function are nececary
  if (!nodeID) var node = obj.osm;
  else var node = nodes[nodeID];

  if (!node) {
    alert("add2Tile");
    return;
  }

  if (node.tileY < latIndexView0) node.tileY = latIndexView0; // outside load area? set inside
  if (node.tileX < lonIndexView0) node.tileX = lonIndexView0;
  if (node.tileY > latIndexViewP) node.tileY = latIndexViewP;
  if (node.tileX > lonIndexViewP) node.tileX = lonIndexViewP;

  if (!viewTiles[node.tileY]) {
    maps.add(obj);
    return;
  } // tileMake(node.tileY, node.tileX) üüü  place "large"
  if (!viewTiles[node.tileY][node.tileX]) {
    maps.add(obj);
    return;
  } // tileMake(node.tileY, node.tileX)

  var map = viewTiles[node.tileY][node.tileX].map;
  if (obj.osm.GetTag("room")) map.more.add(obj);
  else map.add(obj);
}

export function add2TileG(geometry, iCol, nodeID) {
  // for root-"maps" no such function are nececary
  if (!nodeID) var node = geometry.osm;
  else var node = nodes[nodeID];
  if (!node) {
    alert("add2TileG üüü3");
    return;
  }

  if (geometry.osm.id * 1 == dbgOsmID) log("osm Building:", geometry.osm.id);
  else if (dbgReturn) return;

  if (node.tileY < latIndexView0) node.tileY = latIndexView0; // outside load area? set inside
  if (node.tileX < lonIndexView0) node.tileX = lonIndexView0;
  if (node.tileY > latIndexViewP) node.tileY = latIndexViewP;
  if (node.tileX > lonIndexViewP) node.tileX = lonIndexViewP;

  var viewTile = viewTiles[node.tileY][node.tileX];
  var ma = viewTiles[node.tileY][node.tileX].map;
  //if(geo.osm.GetTag("room")) { ma.more.add(geo?mesh) ;return}

  //var mesh = new THREE.Mesh(geo)
  // tttc
  geometry.computeBoundingSphere();

  // http://localhost:5173/go.html?km=1&lat=51.51043759&lon=-0.12087917&ele=29.34&dir=321&view=-18&user=karlos&dbg=2&con=1&tiles=0&opt=2
  // if (viewTile.map_Geos.length == 64 + 8 + 2 + 1)
  // 	log("64 + 8 + 2")
  //	if (viewTile.map_Geos.length >= 64 + 4 + 2) // ttt64
  //		return

  var m = new THREE.Matrix4();
  // viewTile.m geo.merge(geo, m, iCol)

  if (geometry.index) geometry = geometry.toNonIndexed();
  setColors(geometry, iCol);
  viewTile.map_Geos.push(geometry);
}

function setColors(geometry, iCol) {
  var count = geometry.attributes.position.count;
  var color_array = new Float32Array(count * 3);
  if (geometry.groups.length) {
    for (var i in geometry.groups) {
      var materialIndex = geometry.groups[i].materialIndex;
      var start = geometry.groups[i].start;
      var count = geometry.groups[i].count;
      setColor(color_array, materialIndex, start, count);
    }
  } else setColor(color_array, iCol, 0, count);

  geometry.setAttribute("color", new THREE.BufferAttribute(color_array, 3));
}

export function setColor(color_array, iCol, start, count) {
  var material = colors[iCol];
  var color = material.color;
  for (var i = start; i < start + count; i++) {
    color_array[i * 3 + 0] = color.r;
    color_array[i * 3 + 1] = color.g;
    color_array[i * 3 + 2] = color.b;
  }
}

export function add_Map(mesh, nodeID) {
  // for root-"maps" no such function are nececary

  if (!mesh.osm) {
    log("add_Map NO!!! ID:", mesh.osm.id); // (ggf. dbg-)return
    return;
  }

  if (mesh.osm.id * 1 == dbgOsmID) log("mesh Object:", mesh.osm.id);
  else if (dbgReturn) return;

  if (!nodeID) var node = mesh.osm;
  else var node = nodes[nodeID];
  if (!node) {
    alert("add_Map");
    return;
  }
  if (!viewTiles[node.tileY]) {
    maps.add(mesh);
    return;
  } // tileMake(node.tileY, node.tileX) üüü  place "large"
  if (!viewTiles[node.tileY][node.tileX]) {
    maps.add(mesh);
    return;
  } // tileMake(node.tileY, node.tileX)

  var dx = Math.abs(mesh.position.x - posX0);
  var dz = Math.abs(mesh.position.z - posZ0);
  var dd = Phytagoras(dx, dz);
  var d0 = dd < dbgRange;

  var viewTile = viewTiles[node.tileY][node.tileX];
  if (/*gOptimize == 0 ||*/ d0 || !mesh.material.iCol)
    viewTile.map.add(mesh); // Tile must exist already. Done by "viewTileShow"
  else {
    // viewTile.m geo.merge(mesh.geometry, new THREE.Matrix4().makeTranslation(mesh.position.x, mesh.position.y, mesh.position.z), mesh.material.iCol)
    var m4 = new THREE.Matrix4().makeTranslation(
      mesh.position.x,
      mesh.position.y,
      mesh.position.z,
    ); //, mesh.material.iCol
    var geometry = mesh.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().makeRotationY(mesh.rotation.y));
    geometry.applyMatrix4(m4);
    geometry.name = mesh.osm.id;

    if (geometry.index) geometry = geometry.toNonIndexed();
    // tttc
    geometry.computeBoundingSphere();

    var material = mesh.material;
    if (typeof material == Array) {
      log("array!".material.len);
      material = material[0];
    }

    var iCol = material.iCol;
    setColors(geometry, iCol);

    viewTile.map_Geos.push(geometry);
    set_llPos(0);
  }
}

export function addMore(mesh, nodeID) {
  var node;
  if (!nodeID) node = mesh.osm;
  else node = nodes[nodeID];
  if (!viewTiles[node.tileY]) {
    maps.add(mesh);
    return;
  } // tileMake(node.tileY, node.tileX) üüü  place "large"
  if (!viewTiles[node.tileY][node.tileX]) {
    maps.add(mesh);
    return;
  } // tileMake(node.tileY, node.tileX)

  var dx = Math.abs(mesh.position.x - posX0);
  var dz = Math.abs(mesh.position.z - posZ0);
  var dd = Phytagoras(dx, dz);
  var d0 = dd < dbgRange;
  var dd = node.GetTag("3dmr");

  if (gOptimize < 2 || d0 || node.GetTag("GO-Note") || dd) {
    if (dd) viewTiles[node.tileY][node.tileX].map.add(mesh);
    else viewTiles[node.tileY][node.tileX].map.more.add(mesh);
  } else {
    var geometry = mesh.geometry;
    if (!geometry) {
      log("addMore: no fgeo");
      viewTiles[node.tileY][node.tileX].map.more.add(mesh);
      return;
    }

    var viewTile = viewTiles[node.tileY][node.tileX];
    // viewTile.o geo.merge(geo, new THREE.Matrix4().makeTranslation(mesh.position.x, mesh.position.y, mesh.position.z), mesh.material.iCol)

    var m4 = new THREE.Matrix4().makeTranslation(
      mesh.position.x,
      mesh.position.y,
      mesh.position.z,
    ); //, mesh.material.iCol
    geometry.applyMatrix4(m4);
    // tttc
    geometry.computeBoundingSphere();

    var material = mesh.material;
    if (Array.isArray(material)) {
      // log("array!" + material.length)
      material = material[0];
    }

    var iCol = material.iCol;
    setColors(geometry, iCol);

    viewTile.oth_Geos.push(geometry);
    set_llPos(0);
  }
}

function loadTileMake(latIndexV, lonIndexV) {
  var p = Math.pow(2, diffLevel);
  var latIndexL = Math.floor(latIndexV / p);
  var lonIndexL = Math.floor(lonIndexV / p);

  if (loadTiles[latIndexL])
    if (loadTiles[latIndexL][lonIndexL]) {
      // log("loadTiles schon da ",latIndexL,lonIndexL,loadTiles[latIndexL][lonIndexL].state) //
      if (loadTiles[latIndexL][lonIndexL].state) return; // already made
    }
  var tile = new Object();
  tile.state = 1; // 0=Canel? 1=toLoad&show. (?2=loading) 3=Visible. 4=Hidden
  tile.lonIndex = lonIndexL;
  tile.latIndex = latIndexL;
  tile.name = "loadTile-" + lonIndexL + "/" + latIndexL;

  if (!loadTiles[latIndexL]) loadTiles[latIndexL] = [];
  loadTiles[latIndexL][lonIndexL] = tile;
}

export function viewTileMake(latIndex, lonIndex) {
  if (viewTiles[latIndex])
    if (viewTiles[latIndex][lonIndex]) {
      // log("tileMake schon da ",latIndex,lonIndex,viewTiles[latIndex][lonIndex].state) //
      if (viewTiles[latIndex][lonIndex].state) return; // already made
    }

  var viewTile = new Object();
  viewTile.state = 1; // 0=Canel? 1=toLoad&show. (?2=loading) 3=Visible. 4=Hidden
  viewTile.lonIndex = lonIndex;
  viewTile.latIndex = latIndex;
  viewTile.map = new THREE.Mesh(); // Map for main objects
  viewTile.map.more = new THREE.Mesh(); // Map for nodes and more details

  //	viewTile.map.visible = false
  viewTile.map.more.visible = false;
  viewTile.map.more.viewTile = true;
  if (isNaN(lonIndex)) alert("lonIndex NaN");
  viewTile.map.name = "makeTile-" + lonIndex + "/" + latIndex;
  //viewTile.name     = "makeTile-"+lonIndex+"/"+latIndex // weg??

  viewTile.map.add(viewTile.map.more); // if map is hidden, more is hidden too
  maps.add(viewTile.map);

  var latTile = tileY2lat(latIndex + 1, viewLevel); // latIndex*tileSizeLa
  var lonTile = tileX2lon(lonIndex, viewLevel); // lonIndex*tileSizeLo // Tiles sind weg vom Equator schmaler
  var latTileE = tileY2lat(latIndex, viewLevel);
  var lonTileE = tileX2lon(lonIndex + 1, viewLevel); // on is counting up Index and grad, lat is invers!
  //	lastLoadx = GetLon2x(lonTile, latTile)
  //	lastLoadz = GetLat2z(latTile)
  //	lastLoadEx = GetLon2x(lonTileE, latTile)
  //	lastLoadEz = GetLat2z(latTileE)
  set_lastLoad(
    GetLon2x(lonTile, latTile),
    GetLat2z(latTile),
    GetLon2x(lonTileE, latTile),
    GetLat2z(latTileE),
  );

  var material = mlm.floor;
  if (FilterType > 1) material = FilterMaterial;

  var gPlane = new THREE.PlaneGeometry(
    lastLoadEx - lastLoadx,
    lastLoadz - lastLoadEz,
    1,
    1,
  );
  var mplane = new THREE.Mesh(gPlane, material);
  mplane.rotation.x = g(-90);
  mplane.position.x = lastLoadx + mplane.geometry.parameters.width / 2;
  mplane.position.z = lastLoadz - mplane.geometry.parameters.height / 2;
  mplane.position.y = -DrawDelta * 9; // Untergrund unter Wege
  mplane.name = "viewTile" + latIndex + "/" + lonIndex;
  /* if(this.subView) mplane.position.y = -99
	else*/ mplane.receiveShadow = shadow;
  viewTile.map.add(mplane);
  viewTile.floor = mplane;
  // viewTile.m geo = new THREE.BufferGeometry() // ViewTile geometry (main)
  // viewTile.o geo = new THREE.BufferGeometry() // Additional geometry for more objects, less far visible
  viewTile.map_Geos = [];
  viewTile.oth_Geos = [];

  if (!viewTiles[latIndex]) viewTiles[latIndex] = [];
  viewTiles[latIndex][lonIndex] = viewTile;

  loadTileMake(latIndex, lonIndex);
  osmBuilder.LoadOsmTiles(); // triger loading
}

// Called if the camear changes to nanother viewTile: Make tiles hidden/visible/to-be-loaded
function viewTileShow(latIndex, lonIndex, show) {
  // un-/set visible, return true if exists
  // log("show viewTile: ",latIndex,lonIndex)  // 0: hide 1:ways 2:+nodes
  if (viewTiles[latIndex])
    if (viewTiles[latIndex][lonIndex]) {
      var viewTile = viewTiles[latIndex][lonIndex];
      if (viewTile.state == 0 && show > 0) {
        viewTileMake(latIndex, lonIndex);
      }
      if (viewTile.state == 1 && show == 0) {
        viewTile.map.visible = false;
        viewTile.state = 0;
      }
      //	if(viewTile.state==2 && show==0) { viewTile.map.visible = false	;viewTile.state = 0	}  No cancel during load
      if (viewTile.state == 3 && show == 0) {
        viewTile.map.visible = false;
        viewTile.state = 4;
      }
      if (viewTile.state == 4 && show > 0) {
        viewTile.map.visible = true;
        viewTile.state = 3;
      }

      viewTile.map.more.visible = show == 2; // Show also the nodes?
      if (gOptimize > 2) viewTile.map.more.visible = false;

      // 	if(show) log("SHOW viewTile: ",latIndex,lonIndex,show)
      return;
    }
  if (show) viewTileMake(latIndex, lonIndex);
}

//#########################################################################

function logW(text) {
  //  console.log(text)
}

async function asyWasm() {
  console.log("++");

  // >4K geht nur in Firefox!
  var wasmImports = {
    env: {
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
    } /*env*/,
  };

  wasmState = 2; // Code laden
  const response = await fetch("tile.wasm");
  console.log("wasm11"); // response of a XMLHttpRequest
  const buffer = await response.arrayBuffer();
  console.log("wasm22"); // Byte buffer
  const wasmModule = await WebAssembly.compile(buffer);
  console.log("wasm33"); //r wasmModule = new   WebAssembly.Module(wasmCode);
  const wasmInstance = new WebAssembly.Instance(wasmModule, wasmImports); //r wasmInsta= await WebAssembly.instantiate(wasmModule, wasmImports);

  console.log("exports:", wasmInstance.exports);

  expWasm = wasmInstance.exports;
  memWasm = wasmInstance.exports.memory;

  //http();
  wasmState = 3; // Code geladen
  //	osmDo = 1
  console.log("--");
  osmBuilder.LoadOsmTiles(); // triger loading
}

var nodeKARL;
var wayKARL;
var relKARL;

function atoll(ref) {
  if (ref < 0) {
    logW("_ref:" + ref);
    return;
  }
  var txt = new Int8Array(memWasm.buffer, ref, 33);
  var str = new TextDecoder().decode(txt);
  str = str.split(",")[0];
  str = str.split("\n")[0];
  str = str.split("\u0000")[0];
  return str * 1;
}

// Dummies, die durch OSM-go ersetzt werden
function new_Node(id, lat, lon) {
  var ll = atoll(id);
  nodeKARL = new Node(ll, lat, lon);
  logW("... node (id,lat,lon):" + ll + "," + lat + "," + lon);
}

function new_Way(id) {
  var ll = atoll(id);
  wayKARL = new Way(ll);
  logW("--- way (id):," + ll);
}

function new_Rel(id) {
  var ll = atoll(id);
  relKARL = new Rel(ll);
  logW("=== rel (id):," + ll);
}

function addWayNode(id) {
  var ll = atoll(id);
  if (id == 519653630) console.log("wasm519653630");
  if (wayKARL.id) wayKARL.AddNode(ll);
  logW("     wayNode (id):" + ll);
}
function addNodeTag(t, v) {
  var tag = new Int8Array(memWasm.buffer, t, 244);
  var val = new Int8Array(memWasm.buffer, v, 244);
  tag = new TextDecoder().decode(tag);
  val = new TextDecoder().decode(val);
  tag = tag.split("\u0000")[0];
  val = val.split("\u0000")[0];
  if (nodeKARL.id) nodeKARL.AddTag(tag, val);
  logW("     nodeTag (tag,val):" + tag + "," + val);
}
function addWayTag(t, v) {
  var tag = new Int8Array(memWasm.buffer, t, 244);
  var val = new Int8Array(memWasm.buffer, v, 244);
  tag = new TextDecoder().decode(tag);
  val = new TextDecoder().decode(val);
  tag = tag.split("\u0000")[0];
  val = val.split("\u0000")[0];
  if (wayKARL.id) wayKARL.AddTag(tag, val);
  logW("     wayTag (tag,val):" + tag + "," + val);
}
function addRelTag(t, v) {
  var tag = new Int8Array(memWasm.buffer, t, 244);
  var val = new Int8Array(memWasm.buffer, v, 244);
  tag = new TextDecoder().decode(tag);
  val = new TextDecoder().decode(val);
  tag = tag.split("\u0000")[0];
  val = val.split("\u0000")[0];
  if (relKARL.id) relKARL.AddTag(tag, val);
  logW("     relTag (tag,val):" + tag + "," + val);
}
function addRelMem(t, r, o) {
  var type = new Int8Array(memWasm.buffer, t, 244);
  var ref = new Int8Array(memWasm.buffer, r, 244);
  var role = new Int8Array(memWasm.buffer, o, 244);
  type = new TextDecoder().decode(type);
  ref = new TextDecoder().decode(ref);
  role = new TextDecoder().decode(role);
  type = type.split("\u0000")[0];
  ref = ref.split("\u0000")[0];
  role = role.split("\u0000")[0];
  if (relKARL.id) relKARL.AddMember(ref, type, role);
  logW("     relMem (type,ref,role):" + type + "," + ref + "," + role);
}

function httpWasm(url) {
  console.log(url);
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url); // "test.json" "https://osmgo.org/user/st002.txt"
  xhr.responseType = "arraybuffer";
  xhr.onload = callbackWasm;
  xhr.send();
  wasmState = 4; // Tile laden
}

// Must be Javascript
function callbackWasm(e) {
  // console.log(e)
  console.log("+++++ callback +++++");
  clearTimeout(tileTime);

  // OSM-Daten sind hier:
  var target = e.target;
  var buf = target.response; // console.log(new TextDecoder().decode(buf));
  var len = buf.byteLength;
  logW("byteLength:" + len);
  var i8buf = new Int8Array(buf);

  // Daten nach C kopieren:
  var ref = expWasm.memRef();
  var out = new Int8Array(memWasm.buffer, ref, len);

  for (var i = 0; i < len; i++) out[i] = i8buf[i];
  out[len] = 0;

  console.log("===== exp.wasm =====");
  expWasm.wasm();
  wasmState = 5; // Tile geladen
  loadedData = 1;
  console.log("----- callback -----");
}

//#########################################################################

export var osmBuilder;
export function reset_osmBuilder() {
  osmBuilder = new OsmBuilder();
}

// Called if a new tile pops up or after a load: check if a load is needed, start it
export var OsmBuilder = function () {
  // als Objekt geklammert

  if (wasmState) asyWasm();

  //--------------------------------------------------------------------------
  // Vom Overpass-API OSM-Daten fuer einen quadratischen Bereich laden.
  //
  // Parameter: Lat- und Long-Koordinaten des Bezugspunkts in Grad,
  //            Kantenlaenge des quadratischen Bereichs in Metern

  this.ChangeViewTiles = function (lon, lat) {
    // OLD: doOverpassQuery
    // ok: https://overpass-api.de/api/interpreter?data=[out:json];(rel(%2026.6670958,88.45092773,26.67200455,88.45642090);node(26.6670958,88.45092773,26.67200455,88.45642090);way(%2026.6670958,88.45092773,26.67200455,88.45642090);%20%20(._;%3E;););out;

    // hide tiles behind the camera?? ??
    var rad = camera.rotation.y;
    var sc = SinCos(rad, 0);

    if (initGeoPosLat == 51.50706135 && gCustom != 3) {
      // 3 schaltet die Parameter aus
      set_viewLevel(GET_ParD("vil", 17) * 1);
      if (viewLevel < 14) set_viewLevel(14);
      if (viewLevel > 19) set_viewLevel(19); // 17 => 190m
      set_tileDistMax(GET_ParD("tiles", tileDistMax) * 1);
    }

    var lonIndex = lon2tileX(lon, viewLevel); //Math.floor(lon/tileSizeLo)
    var latIndex = lat2tileY(lat, viewLevel); //Math.floor(lat/tileSizeLa)
    var latTile = tileY2lat(latIndex + 1, viewLevel); //		var lonTile  = lonIndex*tileSizeLo // Tiles sind weg vom Equator schmaler
    var lonTile = tileX2lon(lonIndex, viewLevel); //		var latTile  = latIndex*tileSizeLa
    var latTileE = tileY2lat(latIndex, viewLevel);
    var lonTileE = tileX2lon(lonIndex + 1, viewLevel);

    //log(lat,lon,latTile,lonTile,tileSizeLa,latIndex,lonIndex)

    if (initGeoPosLat == 51.50706135) {
      var xz = [0, 0];
      if (!GET_ParD("km", 0) * 1) {
        // Kein Start per Key_M
        //	xz = SinCos(dir, Math.sin(view*2)*posY0 )
        xz = SinCos(dir, posY0);
      }
      //	tileSizeLa  = GET_ParD("tile" ,tileSizeLa )*1 ;if(tileSizeLa<0.0005) tileSizeLa=0.0005
      //	tileSizeLo  = tileSizeLa * 1.5
      initGeoPosLon = lonTile; // Math.floor(lon/tileSizeLo)*tileSizeLo // Tiles sind weg vom Equator schmaler
      initGeoPosLat = latTile; // Math.floor(lat/tileSizeLa)*tileSizeLa
      set_posXZ0(
        (camera.position.x = GetLon2x(lon, lat) - xz[0]),
        (camera.position.z = GetLat2z(lat) + xz[1]),
      );

      if (control)
        if (control.Flight)
          if (control.Flight.flightObj) {
            control.Flight.flightObj.position.copy(camera.position);
            control.Flight.flightObj.rotation.copy(camera.rotation);
          }
    }

    this.lastLoadx = GetLon2x(lonTile, latTile);
    this.lastLoadz = GetLat2z(latTile);
    this.lastLoadEx = GetLon2x(lonTileE, latTile);
    this.lastLoadEz = GetLat2z(latTileE);
    // log(lastLoadx,lastLoadEx,lastLoadz,lastLoadEz)

    if (lowDome)
      lowDome.position.set(this.lastLoadx, DrawDelta * 6, this.lastLoadz);

    // ALL close coordinates: Create or show
    viewTileShow(latIndex, lonIndex, 2); // Center viewTile first
    for (var la = latIndex - tileDistMax; la <= latIndex + tileDistMax; la++) {
      for (
        var lo = lonIndex - tileDistMax;
        lo <= lonIndex + tileDistMax;
        lo++
      ) {
        var dlo = Math.abs(lo - lonIndex);
        var dla = Math.abs(la - latIndex);
        var dis = Math.max(dla, dlo);
        if (dis <= /*1*/ moreMax)
          viewTileShow(la, lo, 2); // same or next
        else if (dis <= tileDistMax)
          viewTileShow(la, lo, 1); // visible
        else viewTileShow(la, lo, 0); // invixible but loaded already
      }
    }

    // Check EXISTING tiles. Not Close?: hide (close to "look at" viewTile)
    for (var la in viewTiles) {
      //log("tiles la: ",la)
      for (var lo in viewTiles[la]) {
        //log("tiles lo: ",lo)
        var viewTile = viewTiles[la][lo];
        var dla = Math.abs(viewTile.latIndex - latIndex);
        var dlo = Math.abs(viewTile.lonIndex - lonIndex); //Inde5??
        var dis = Math.max(dla, dlo);

        if (dis > tileDistMax) {
          viewTileShow(la, lo, 0);
        } // Distandce not near?
        else if (dis > /*1*/ moreMax) viewTileShow(la, lo, 1);
        else viewTileShow(la, lo, 2);
      }
    }
  }; //ChangeViewTiles

  this.LoadTiles = function () {
    if (tileLoading) return;
    if (wasmState == 2) return;

    var c = 0; // laod-level how many levels less but the view-level

    /* Not the own position first but the next to view to OUT ööö
		var rad = camera.rotation.y
		var sc  = SinCos(rad,1) */
    var loadLevel = viewLevel - diffLevel;

    var lon = camera.Lon(); //		var lon = GetX2Lon( camera.position.x)
    var lat = camera.Lat(); //		var lat = GetZ2Lat(-camera.position.z)
    var lonIndex = lon2tileX(lon, loadLevel); //+ 0.5 + sc[0] // No floor! But -0.5 to come to the compared corner of the viewTile
    var latIndex = lat2tileY(lat, loadLevel); //- 0.5 + sc[1]

    var latTile = 0;
    var lonTile = 0;
    var tileToLoad = 0;

    var a = 0;
    var minTilLoad = 9e9;

    if (simul) {
      if (dbg > 1) log("Overpass: SIMULATION");
      if (simul == 1) {
        set_simul(2);
        loadedData = JSON.parse(JSON2); // Antworttext auswerten in Javascriptvariablen
      }
      return;
    }

    // search for the closest tile to be loaded
    tileToLoad = false;
    for (var la in loadTiles) {
      for (var lo in loadTiles[la]) {
        var tile = loadTiles[la][lo];
        if (tile.state == 1) {
          var dla = Math.abs(tile.latIndex - latIndex);
          var dlo = Math.abs(tile.lonIndex - lonIndex);
          var dis = Phytagoras(dla, dlo);
          if (minTilLoad > dis) {
            // Closest tile?
            minTilLoad = dis;
            tileToLoad = tile;
          }
        }
      }
    }
    if (!tileToLoad) return;

    var latTile = tileY2lat(tileToLoad.latIndex + 1, loadLevel); //x tile.latIndex*tileSizeLa
    var lonTile = tileX2lon(tileToLoad.lonIndex, loadLevel); //y tile.lonIndex*tileSizeLo
    var latTileE = tileY2lat(tileToLoad.latIndex, loadLevel); // End coordiantes
    var lonTileE = tileX2lon(tileToLoad.lonIndex + 1, loadLevel);

    tileToLoad.state = 2;
    //	if(osmDo==-1) return //**Simulation

    tileLoading = tileToLoad;
    set_osmDo(1);
    var latIndexL = tileLoading.latIndex;
    var lonIndexL = tileLoading.lonIndex;
    var p = Math.pow(2, diffLevel);
    latIndexView0 = latIndexL * p;
    lonIndexView0 = lonIndexL * p;
    latIndexViewP = latIndexL * p + p - 1;
    lonIndexViewP = lonIndexL * p + p - 1;

    var bbox =
      +latTile.toFixed(8) +
      "," +
      lonTile.toFixed(8) +
      "," +
      latTileE.toFixed(8) +
      "," +
      lonTileE.toFixed(8);

    // https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
    // BAD:
    var url = httpx + "api.openstreetmap.fr/oapi"; // France		server not found
    var url = httpx + "overpass.openstreetmap.ru/api"; // Russian		timeout
    // Limited
    var url = httpx + "overpass.osm.ch/api"; // Switzerland only
    // ok:
    var url = httpx + "maps.mail.ru/osm/tools/overpass/api"; // Russia
    var url = httpx + "overpass.osm.jp/api"; // Japan
    var url = httpx + "overpass.private.coffee/api"; // Private.coffee Overpass Instance
    var url =
      httpx +
      "overpass-api.de/api" + // Default
      "/interpreter?data=[out:json];(" +
      "rel( " +
      bbox +
      ");";
    //		+ "  (._;>;);"  // ???????
    //		+ "  (._;<<;);"  // Nötig für Sites(rel of rel) Alex. Overpass dauert aber Ewig!
    if (gAviation)
      url +=
        'node["generator:source"="wind"](' +
        bbox +
        ');node["place"](' +
        bbox +
        ");";
    else url += "node(" + bbox + ");";

    url +=
      "way( " +
      bbox +
      ");" +
      "  (._;>;);" +
      //				+ "  (._;<<;);"  // Aktiv: Mehr WAYs aber ohne NODEs dazu!!

      ");out;";

    if (gServer == 3) {
      url =
        "http://85.214.118.251:8080/all/" +
        (viewLevel + diffLevel) +
        "/" +
        lonIndexL +
        "/" +
        latIndexL +
        ".topojson"; // kein httpS! "http://85.214.118.251:8080/all/16/35119/22000.topojson"
      log("URL3:" + url);
    }

    if (gCustom == 2) {
      // Wien
      url =
        httpx +
        "overpass-api.de/api" +
        "/interpreter?data=[out:json];(" +
        " rel( " +
        bbox +
        ");" +
        " way( " +
        bbox +
        ");" +
        "  (._;>;);" +
        ");out;";
    }

    //--------------------------------------------------------------------------

    if (waysL > waysMax) return; // Für iOS rechtzeitig aufhöhren

    if (wasmState) {
      httpWasm(url);
    } else {
      var xmlhttp = new XMLHttpRequest();

      xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
          if (dbg > 1)
            log(
              "Overpass: Query beantwortet " + new Date().toLocaleTimeString(),
            );
          //log(xmlhttp.responseText.substr(0,19) )
          clearTimeout(tileTime);

          // Das könnte schon in den Renderzyklus:
          loadedData = JSON.parse(xmlhttp.responseText); // Antworttext auswerten in Javascriptvariablen
          if (dbg > 1)
            log(
              "Overpass: Text ausgewertet " + new Date().toLocaleTimeString(),
            );
        }
      };

      xmlhttp.onprogress = function (evt) {
        if (dbg > 3) log("onprogress - loaded,total: ", evt.loaded, evt.total);
      };

      xmlhttp.timeout = function (evt) {
        loadTimeout();
      };

      xmlhttp.open("GET", url, true);
      xmlhttp.send();
    } // kein Wasm

    tileTime = setTimeout(loadTimeout, 25 * 1000);

    if (dbg > 1)
      log(
        "Overpass: " +
          tileToLoad.lonIndex +
          "/" +
          tileToLoad.latIndex +
          " " +
          new Date().toLocaleTimeString(),
      );
    if (dbg > 3) log(url);
  }; // LoadTiles

  ///..................

  this.readJsonData = function () {
    if (wasmState == 5) {
      // geladen?
      wasmState = 3; // bereit
      loadedData = 0;
      return false; // nicht weiter
    }

    if (gServer == 3) {
      // VectorRead(loadedData)
      loadedData = 0;
      return false;
    }

    if (elementIndex == 0) {
      elementsData = loadedData;
      loadedData = 0; // Viel kopierzeit??
    }

    /// Schleife abbrechen wie der renderer es tut, wenn die Zeit zu lang wird ###################################################

    // Alle OSM-Elemente analysieren
    var countdown = maxDT;
    var dt_e = 0;

    while (countdown > 0) {
      //for (var e in elementsData.elements)   // Alle OSM-Elemente: Node/Way/...
      if (!elementsData) {
        log(" Keine element-liste? Kommt vor. URL= " + url);
        return false;
      }
      if (!elementsData.elements[elementIndex]) {
        log(" Keine elemente? Kommt vor. URL= " + url);
        return false;
      }
      var element = elementsData.elements[elementIndex];

      if (element.type == "node") {
        // Eine Node (von vielen), Punkt mit GPS-Koordinaten und mehr
        var nodeKARL = new Node(element.id, element.lat, element.lon);
        var node_tags = element.tags; // dessen OSM-tags
        // Wenn eskeine Tags gibt, gibt es auch keinnen Instanz-Member vom Type Tag-Array!
        for (var key in node_tags) {
          // node-OSM-tags
          //log("key = " + key + ", value = " + node_tags[key]);
          if (nodeKARL.id) {
            nodeKARL.AddTag(key, node_tags[key]);
          } // tags++
        } // node_tags nnnn

        if (element.id == 3815077900) NodesExebitionPlace();

        if (element.id == 5171826742) log("osm Found: repo Node 5171826742");

        if (element.id == 297042815) {
          var node = nodes[297042815];
          ModelPlace(4798, "server", "car", node.x, node.z, "obj");
        }

        if (element.id == 254014474 && gCustom == 3)
          nodeKARL.typeMain = "Mdl:hide";

        if (element.id == 3195289796) {
          log(
            "node id  3195289796: Add Model Alexanderplatz #####################################",
          );
          var mRel = new Rel("4711");
          if (mRel.id > 0) {
            mRel.AddTag("type", "3d_model");
            mRel.AddTag("server", "osm_go");
            mRel.AddTag("model", "DE_berlin_alexanderplatz");
            mRel.AddMember("3195289796", "node", "center");
            mRel.AddMember("304987177", "way", "hide"); // Outer von REL 4065109 = 2D-Multipollygon. Notwendig trotz 4065110?
            mRel.AddMember("4065110", "rel", "hide"); // Rel mit vielen  building:part   get das?
            mRel.AddMember("326772329", "way", "hide"); // TEST!! ??
            mRel.AddMember("230818931", "way", "hide"); // TEST!! ??
            mRel.AddMember("217537052", "way", "hide"); // TEST!! ??
            mRel.AddMember("397891642", "way", "hide"); // TEST!! ??
            mRel.AddMember("96880477", "way", "hide"); // TEST!! ??
            mRel.AddMember("304987174", "way", "hide"); // TEST!! ??
            mRel.AddMember("304987173", "way", "hide"); // TEST!! ??
            mRel.AddMember("304987172", "way", "hide"); // TEST!! ??
            mRel.AddMember("304987176", "way", "hide"); // TEST!! ??
            mRel.AddMember("96880470", "way", "hide"); // TEST!! ??
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
        if (element.id == 1659791900) {
          // Node!
          log(
            "node id 1659791900: Add Model London Eye #####################################",
          );
          var mRel = new Rel("4712");
          if (mRel.id > 0) {
            mRel.AddTag("type", "3d_model");
            mRel.AddTag("server", "osm_go");
            mRel.AddTag("model", "UK_london_eye");
            mRel.AddMember("1659791900", "node", "center");
          }
        } /***/

        if (element.id == 3722134520) {
          log(
            "node id 3722134520 Add Model ''Dubai Hotel'' #####################################",
          );
          var mRel = new Rel("4714");
          if (mRel.id > 0) {
            mRel.AddTag("type", "3d_model");
            mRel.AddTag("server", "osm_go");
            mRel.AddTag("model", "AE_dubai_hotel");
            mRel.AddTag("format", "dae");
            mRel.AddMember("3722134520", "node", "center");
            mRel.AddMember("12700546", "way", "hide");
          }
        }

        if (element.id == 4397379799) {
          log(
            "node id 4397379799: Add Model ''Atomium'' #####################################",
          );
          var mRel = new Rel("4715");
          if (mRel.id > 0) {
            mRel.AddTag("type", "3d_model");
            mRel.AddTag("server", "osm_go");
            mRel.AddTag("model", "BE_brussels_atomium"); //
            mRel.AddTag("format", "dae");
            mRel.AddMember("4397379799", "node", "center");
            mRel.AddMember("442046313", "way", "hide");
            mRel.AddMember("442102754", "way", "hide");
            mRel.AddMember("388842414", "way", "hide");
            mRel.AddMember("442046315", "way", "hide");
            mRel.AddMember("1243821", "rel", "hide"); // ?? why next??
            mRel.AddMember("442044563", "way", "hide"); // ??
          }
        } //4397379799

        if (element.id == 1612269507) {
          log(
            "node id 1612269507: Add Model ''Orion Zeigermann'' #####################################",
          );
          var mRel = new Rel("4717");
          if (mRel.id > 0) {
            mRel.AddTag("type", "3d_model");
            mRel.AddTag("server", "osm_go");
            mRel.AddTag("model", "orion"); //
            mRel.AddTag("format", "obj");
            mRel.AddMember("1612269507", "node", "center");
          }
        } //1612269485

        if (element.id == 383352481)
          if (rels[4718] === undefined) {
            log(
              "node id 383352481: Add Model ''Orion ohne Lift'' #####################################",
            );
            var mRel = new Rel("4718");
            if (mRel.id > 0) {
              mRel.AddTag("type", "3d_model");
              mRel.AddTag("server", "osm_go");
              mRel.AddTag("model", "orion_"); //
              mRel.AddTag("format", "obj");
              mRel.AddMember("383352481", "node", "center");
            }
          } //383352481

        // Kuala Lumpur: 137396365 ==> 137331261

        //if (element.id == 40819160830000) { //  ___WEG_wegen_3dmr Quelle: https://www.thingiverse.com/thing:22051

        //			if(element.id==3701919583) 				nodeKARL.typeMain = "Mdl:node"
      } // "node"

      // way kommt IMMER nach ALLEN nodes. Also kann man hier sofort den Way bearbeiten

      if (element.type == "way") {
        // Linie/Kreis von Nodes
        //log("way: ",element)
        var wayKARL = new Way(element.id);
        var way_nodes = element.nodes; // dessen n-array

        for (var n in way_nodes) {
          // node-OSM-IDs
          var node_id = way_nodes[n];
          //log("id: ",node_id)
          if (wayKARL.id) wayKARL.AddNode(node_id);
        } // way_nodes

        var way_tags = element.tags; // dessen OSM-tags
        // Wenn eskeine Tags gibt, gibt es auch keinnen Instanz-Member vom Type Tag-Array!
        for (var key in way_tags) {
          // way-OSM-tags
          //log("key = " + key + ", value = " + way_tags[key]);
          if (wayKARL.id) {
            wayKARL.AddTag(key, way_tags[key]);
          } // tags++
        } // way_tags

        //			if(element.id==204068874)
        //				ways[204068874].values[11] = "98"  // 261  90 180 270=9+261

        if (element.id == 204068874) wayKARL.typeMain = "Mdl:Eye";
        /*
				if(element.id==153273219) wayKARL.typeMain = "Mdl:Eye"
				if(element.id==153273223) wayKARL.typeMain = "Mdl:Eye"
				if(element.id==153273224) wayKARL.typeMain = "Mdl:Eye"
				if(element.id==153273222) wayKARL.typeMain = "Mdl:Eye"
	wwww */

        if (element.id == 550964809 && gCustom == 3)
          wayKARL.typeMain = "Mdl:hide";
        if (element.id == 24261269 && gCustom == 3) {
          wayKARL.typeMain = "Mdl:hide";
          var wn = wayKARL.wayNodes[0];
          var node = nodes[wn];
          ModelPlace(4903, "server", "Parkhaus", node.x, node.z, "obj");
        }

        if (parMdl > 0) {
          if (element.id == 308021389) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 308021390) wayKARL.typeMain = "Mdl:hide"; //eiffel
          if (element.id == 69034180) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 69034127) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 69034135) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 69034179) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 308145259) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 308145258) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 308021391) wayKARL.typeMain = "Mdl:hide"; //eiffel
          if (element.id == 308687749) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 308687747) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 442046313) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 442102754) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 388842414) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 442046315) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 442044563) wayKARL.typeMain = "Mdl:hide";
          if (element.id == 12700546) wayKARL.typeMain = "Mdl:hide";

          if (element.id == 308145239) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308145237) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308145236) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308145233) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308145234) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687749) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687746) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687755) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687751) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687744) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687754) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687750) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687747) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687748) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687745) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687753) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308687752) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308689165) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308689166) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308689167) wayKARL.typeMain = "Mdl:Eiffel";
          if (element.id == 308689164) wayKARL.typeMain = "Mdl:Eiffel";
        }
      } // if way

      if (element.type == "relation") {
        //if(element.id==3403195 || dbg>=5) // ööö				log("OSM relation: ",element.id,element)

        if (dbg > 3) log("relation id/type:", element.id, element.tags["type"]);

        if (!element.tags) {
          if (dbg > 2) err("Relation without tags " + element.id);
        } else {
          if (element.tags["type"] == "3d_model") log("############ MODEL: ");
          var rel_tags = element.tags; // dessen OSM-tags
          var relKARL = new Rel(element.id);
          for (var key in rel_tags) {
            // relatoins-OSM-tags
            if (relKARL.id) {
              relKARL.AddTag(key, rel_tags[key]);
            } // tags++
            if (dbg > 3) log("rel-tag/val: ", key, rel_tags[key]);
          } // rel_tags

          var members = element.members; // relations dessen member-array
          for (var m in members) {
            var member = members[m];
            if (dbg > 4)
              log(
                "rel-member-Nr/ref/type/role: ",
                m,
                member.ref,
                member.type,
                member.role,
              );
            if (relKARL.id)
              relKARL.AddMember(member.ref, member.type, member.role);
          } // rel_nodes
        } // mit tags

        if (parMdl > 0) {
          if (element.id == 1243821) relKARL.typeMain = "Mdl:rel-Atom";
          if (element.id == 4114840) relKARL.typeMain = "Mdl:rel-Eiffel";
          if (element.id == 4114841) relKARL.typeMain = "Mdl:rel-Eiffel";
          if (element.id == 4114842) relKARL.typeMain = "Mdl:rel-Eiffel";
          if (element.id == 4114838) relKARL.typeMain = "Mdl:rel-Eiffel";
          if (element.id == 4114839) relKARL.typeMain = "Mdl:rel-Eiffel";
          if (element.id == 4065110) relKARL.typeMain = "Mdl:rel-Alex";
        }
      } // if relation

      elementIndex++;
      if (elementIndex >= elementsData.elements.length) {
        elementIndex = 0;
        elementsData = undefined;
        //console.log("END tags,ways,nodes: ",element.tags,ways.length,nodes.length)
        if (dbg > 1)
          log("Overpass: DATEN VERARBEITET " + new Date().toLocaleTimeString());
        return false; // nicht weiter, fertig
      }

      dt_e = clock.getDelta();
      countdown -= dt_e;
    } // countdown (ALT: elements)

    return true; // weiter
  }; // readJsonData
}; // OsmBuilder

//=============================================================================
// Von aussen zugaengliche Memberfunktionen des OsmBuilder-Objekts

OsmBuilder.prototype.readJsonData = function () {
  return this.readJsonData();
};

OsmBuilder.prototype.QueryOsmTiles = function (lon, lat) {
  // fuer eine Geo-Position die OSM-Daten eines quadratischen Bereichs lesen
  this.ChangeViewTiles(lon, lat); // old doOverpassQuery(lat, lon)
};

OsmBuilder.prototype.LoadOsmTiles = function () {
  //	clearTimeout(this.tileTime)
  this.LoadTiles(); // old doOverpassQuery(lat, lon)
};

OsmBuilder.prototype.IsOsmDataAvail = function () {
  // Abfrage ob OSM-Daten aufbereitet vorliegen
  return loadedData != 0;
};

// ENDE OsmBuilder ======================================================================

function NodesExebitionPlace() {
  // ppp ppp

  if (nodes[101]) return;

  var geometry = new THREE.PlaneGeometry(1111, 1111, 1, 1);
  var mesh = new THREE.Mesh(geometry, mlm.white);
  mesh.name = "NodesExebitionPlace";
  mesh.rotation.x = g(90);
  maps.add(mesh);

  var x = 0;
  var z = 0;
  var i = 100;
  var d = 0.00003; // 3m
  var node;
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "pub");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("information", "guidepost");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("man_made", "flagpole");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("man_made", "surveillance");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("highway", "bus_stop");
  node.AddTag("public_transport", "platform");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("seamark", "any");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("historic", "memorial");
  node.AddTag("memorial:type", "stolperstein");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("historic", "wayside_cross");

  z = 0;
  x -= d;
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "bench");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "grit_bin");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "waste_basket");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "vending_machine");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "atm");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "clock");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "table");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "telephone");
  z = 0;
  x -= d;
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "post_box");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "parking");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "recycling");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "fountain");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "public_bookcase");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "taxi");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "drinking_water");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("amenity", "toilets");

  z = 0;
  x -= d;
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("tourism", "artwork");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("information", "board");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("advertising", "column");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("place", "usburb");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("traffic_signXXX", "XXX");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("addr:postcode", "AB12");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("communication:mobile_phone", "any");

  z = 0;
  x -= d;
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("highway", "street_lamp");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("highway", "stop");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("highway", "give_way");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("highway", "traffic_signals");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("highway", "crossing");
  node.AddTag("crossing", "island");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("highway", "crossing");
  node.AddTag("crossing", "zebra");

  z = 0;
  x -= d;
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("cycleway", "asl");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("emergency", "fire_hydrant");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("emergency", "phone");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("railway", "signal");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("railway", "milestone");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("railway", "subway_entrance");

  z = 0;
  x -= d;
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("barrier", "bollard");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("barrier", "???");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("natural", "tree");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("power", "generator");
  node.AddTag("generator:source", "wind");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("leisure", "picnic_table");
  z += d;
  i++;
  node = new Node(i, x, z);
  node.AddTag("leisure", "playground");

  // At last one way must be!
  var way = new Way(90);
}

/****/
