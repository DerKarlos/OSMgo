import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import chroma from "chroma-js";
import { add_Map, addMore } from "./osm.js";
import { SinCos } from "./controls.js";
import { addRepo } from "./repo.js";

import {
  gCustom,
  r,
  dbg,
  log,
  osmBnode_id,
  inc_osmBnode_id,
  terr,
  mlm,
  shadow,
  DrawDelta,
  g,
  err,
  dbgOsmID,
  dbgReturn,
  scene,
} from "./main.js";

import {
  FilterType,
  FilterString,
  FilterArray,
  FilterMaterial,
  NodeGeo,
  OPAC,
  colors,
  partView,
  levelHeight,
  layerHeight,
} from "./render.js";
import { nodes, Node } from "./render_node.js";
import { DummyToSetBuilding } from "./render_building.js";
import { BoxGeometry, Mesh } from "three/webgpu";
import { vec3 } from "three/tsl";

///////////////////////////////////////////////////////////////////////////////
////// Klasse: Way ////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export var ways = [];
export function reset_ways() {
  ways = [];
}
export var waysL = 0;
export var wayFirst = undefined;
export var buildingParts = 0;
export function inc_buildingParts() {
  buildingParts++;
}
export var llPos = 0;
export function set_llPos(v) {
  llPos = v;
} // calculated height positon

var wayNeLaI = 0; // Init
var wayCount = 0;
var wayIndex = -1;
export function inc_wayIndex() {
  wayIndex++;
}
var subType;

var tagNames = false;
var tagInfos = false;

export function ResetTilesWay() {
  waysL = 0;
  wayFirst = undefined;
  wayNeLaI = 0; // Init
  wayIndex = -1;
  wayCount = 0;
}

DummyToSetBuilding();

export function Way(id) {
  if (id == 99 * 249958667)
    // Kirche 30734422 ,   Fußweg 249958667
    log("wwww Debug: Way ID: ", id); /// iiii

  if (id == 0) {
    id = osmBnode_id;
    inc_osmBnode_id();
  }

  if (ways[id]) {
    this.id = 0; // Wird auch als Kennung für "gibt es" genutzt
    return; // Way war schon da  ==> return false/null/undefined geht nicht, es ist ein New, da wird IMMER eine neue Instanz erzeugt und returned
  }
  waysL++;
  this.id = id;
  this.tags = [];
  this.values = [];
  this.wayNodes = [];
  this.typeMain = undefined;
  this.filter = FilterType > 1; // Wegfiltern?!

  if (FilterString)
    if (this.id.toString().indexOf(FilterString) >= 0) {
      FilterArray.push(this);
      this.filter = false; // doch sichtbat
    }

  if (id == 0) return; // pseudo way

  ways[id] = this; //	ways.push(this);
  if (wayNeLaI) wayNeLaI.next = this;
  wayNeLaI = this;
  wayCount++;
  if (!wayFirst) wayFirst = this;
  if (dbg >= 4) log("new Way ", id);
} ////end constructor of Way

Way.prototype.AddNode = function (node) {
  // log("AddNode",node.id)
  if (this.wayNodes === undefined) {
    log("MIST!wn", this, node);
    return;
  }
  this.wayNodes.push(node);
};

Way.prototype.AddTag = function (tag, value) {
  if (this.tags === undefined) {
    log("tags MIST!wt", this, tag, value);
    this.tags = [];
    this.values = [];
  }
  tag = tag.replace("color", "colour"); // !!@ Falschen Tag in OSM allle ändern?
  this.tags.push(tag);
  this.values.push(value);
  //log("Way:AddTag",this.tags.length,tag+":"+value)
  if (FilterString)
    if (tag.indexOf(FilterString) >= 0 || value.indexOf(FilterString) >= 0) {
      FilterArray.push(this);
      this.filter = false; // doch sichtbat
    }
};

Way.prototype.GetTag = function (tag, defVal, noNan) {
  for (var t in this.tags) {
    if (this.tags[t] == tag) {
      var val = this.values[t];
      var two = val.split(";");
      if (two.length > 1) {
        // log("Two Tag-Values (" + val + ") in way id " + this.id)
        val = two[0];
      }
      val = val.replace(",", ".");
      try {
        var arr = val.split(" "); // if "nnn m" unit is m for meter: drop it
      } catch (err) {
        log("catchhh");
      }
      if (arr.length > 1 && arr[1] == "m") val = arr[0];
      if (val[val.length - 1] == "'")
        // feed?
        val = val.substr(0, val.length - 1) * 0.3048;
      if (val[val.length - 1] == "m" && val[0] >= "0" && val[0] <= "9")
        // @@@  bad direct m?
        val = val.substr(0, val.length - 1) * 1;
      if (val == "1-") val = "-1";
      if (noNan && isNaN(val * 1)) {
        log("Real-Value (" + val + ") NaN? way id " + this.id);
        return defVal;
      }
      return val;
    }
  }
  if (defVal || defVal == 0) return defVal;
  else return false;
};

Way.prototype.WayTag = function (tag) {
  for (var t in this.tags) {
    if (this.tags[t] == tag) {
      this.tags[t] = "highway";
    }
  }
};

Way.prototype.AngleAtNode = function (n) {
  var m = n * 1 + 1;
  if (n > 0) m = n * 1 - 1;
  var node1 = nodes[this.wayNodes[m]];
  var node2 = nodes[this.wayNodes[n]];

  var x = node1.x - node2.x;
  var z = node1.z - node2.z;
  return r(Math.atan2(x, z)); // Angle
};

Way.prototype.Shape = function (material, drawLevel, more) {
  var last;
  var points = [];
  for (var n in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[n]];
    if (last) {
      if (node.x == last.x && node.z == last.z) {
        terr("Way:" + this.id + " Node " + last.id + "=" + node.id, this);
        continue;
      }
    }
    points.unshift(new THREE.Vector2(node.x, node.z));
    if (dbg >= 5) log("Shape-Node: ", n, this.wayNodes[n], node.x, node.z);

    if (node.GetTag("entrance")) {
      node.Entrance(this.AngleAtNode(n));
    }
    last = node;
  }

  if (this.wayNodes.length < 4)
    if (dbg > 2) err("Shape with <3(+1) Nodes! Way-ID:" + this.id);
  if (this.wayNodes.length < 4) return;

  var shape = new THREE.Shape(points);
  if (!material) return shape; // ===========>

  if (typeof this.holes !== "undefined") shape.holes = this.holes;

  if (FilterType > 1 && this.filter) material = FilterMaterial;
  if (llPos < 0) drawLevel = 0; // No hight-fight under ground?

  var geometry = new THREE.ShapeGeometry(shape);
  var matrix = new THREE.Matrix4();
  matrix.makeRotationX(g(90));
  geometry.applyMatrix4(matrix);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos + drawLevel;
  if (mesh.position.y >= -0.5) mesh.receiveShadow = shadow;
  mesh.osm = this;

  var m = Math.floor(this.wayNodes.length / 2);
  if (more) addMore(mesh, this.wayNodes[m]);
  else add_Map(mesh, this.wayNodes[m]);
}; // End Shape

Way.prototype.PowerLine = function (material, posts) {
  // minor_line   location=underground
  if (FilterType > 1 && this.filter) material = FilterMaterial;

  var geoMast = new THREE.CylinderGeometry(0.2, 0.3, 20, 16); // old: 04,0.6
  geoMast.groups = [];
  var hLine = 20 - 2 - 1;
  var oLine = 20 / 2 - 1;

  if (this.GetTag("power") == "line") {
    var h = 30;
    var x = h / 2;
    var o = h / 25;
    var u = h / 15;
    var right = new NodeGeo()
      .cyl(0, o, x, 4)
      .roty(+45)
      .rotz(+95.5)
      .trans(-x / 1.85, h * 1.02, 0);
    var left = new NodeGeo()
      .cyl(0, o, x, 4)
      .roty(-45)
      .rotz(-95.5)
      .trans(+x / 1.85, h * 1.02, 0);
    var top_ = new NodeGeo()
      .cyl(0, o, h / 3, 4)
      .roty(+45)
      .trans(0, h + h / 3 / 2, 0);
    var geoMast = new NodeGeo()
      .cyl(o, u, h, 4)
      .roty(+45)
      .trans(0, h / 2, 0)
      .merge(right)
      .merge(left)
      .merge(top_).geometry;
    geoMast.groups = [];
    material = mlm.line;
    hLine = h;
    oLine = 0;
  }

  var geoLine = new THREE.BufferGeometry();
  var vertices = [];
  for (var i in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[i]];
    if (node.typeMain) continue;
    node.typeMain = "powerline";

    var mm = material;
    // http://localhost:5173/index.html?lat=49.72245351036534&lon=11.122718453407288&dir=0&view=-10&ele=101&multi=0&tiles=0
    // https://www.openstreetmap.org/node/314697960

    // http://localhost:5173/index.html?km=1&lat=49.71812542&lon=11.11798434&ele=500.00&dir=50&view=-64&user=karlos&dbg=0&con=1&id=265498804&tiles=5&opt=0
    // https://www.openstreetmap.org/way/265498804#map=16/49.72050/11.11540

    //if (node.id == 314697960) {
    //	log("tttl power node: ", node.id, node.x, node.z)
    //	mm = mlm.blue
    //	var box = new Mesh(new BoxGeometry(6, 6, 6))
    //	box.position.x = node.x
    //	box.position.z = node.z
    //	scene.add(box)
    //}
    // .. wird ein Stück line/Leitung
    var a = this.AngleAtNode(this.wayNodes.indexOf(node.id));
    vertices.push(node.x, hLine, node.z);

    // .. und ein Mast
    var mesh = new THREE.Mesh(geoMast, mm); //tttl material);
    mesh.position.y = oLine;
    mesh.position.x = node.x;
    mesh.position.z = node.z;
    mesh.rotation.y = g(a);
    mesh.osm = node;
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    if (posts) add_Map(mesh);
  }

  geoLine.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3),
  );
  geoLine.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array([1, 1]), 2),
  );
  geoLine.computeVertexNormals();

  var mesh = new THREE.Line(geoLine, mm); //tttl material);
  mesh.osm = this;
  if (posts) {
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
  } else mesh.position.y = -(20 - 2) - 12; // Line from in the air to underground
  var node = Math.floor(this.wayNodes.length / 2);
  add_Map(mesh, this.wayNodes[node]);
}; // Power

const colX = [];
//colX["0xFFFF80"] = "ivory"	// This schould be ok!   ID246303876
colX["cream"] = "yellow";
colX["light_brown"] = "brown";
colX["light_grey"] = "lightgrey"; // 53332480
colX["light grey"] = "lightgrey";
colX["light_green"] = "lightgreen"; // 126103549
colX["yellow-brown"] = "yellow";
//lX["ligmaronht_brown"] = "brown"
colX["maron"] = "maroon"; // 42750497
colX["dark_grey"] = "darkgrey"; // 31363515, 42891466, ...
colX["dark_green"] = "darkgreeen";
colX["grez"] = "grey"; // ID31361616 Erlangen: geändert, ok
colX["red-brown"] = "#D21515"; // red = 255,0,0   brown = (165,42,42)   Mix = 210,21,21

export function ColourMaterial(col, darken, way, black) {
  // ToDo: if _ or - split, if first light or dark modify x%
  if (col.indexOf("0x") == 0)
    // chroma.js doesn't work with prefix 0x, even as it descripted
    log("chroma 0x ok?");
  //	col = col.replace("0x", "#");
  if (colX[col]) col = colX[col];
  col = col.replace("-", " ");
  col = col.replace("_", "");
  try {
    col = chroma(col)
      //.darken(darken)
      .hex();
  } catch (err) {
    // log("ColourMaterial-1:",col,that,err)
    try {
      var co2 = col.split(" ");
      if (co2[0] == "light") col = chroma(co2[1]).brighten().hex();
      else col = chroma.mix(co2[0], co2[1]).hex();
      var mat = new THREE.MeshLambertMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: OPAC,
      });
      mat.iCol = colors.length;
      mat.name = col;
      colors.push(mat);
      return mat;
    } catch (err) {
      terr("Bad colour: " + col, way, err);
      return mlm.sky;
    }
  }

  if (gCustom == 1) {
    if (black) col = 0;
    else col = 0xffffff;
  }

  var mat = new THREE.MeshLambertMaterial({
    color: col,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: OPAC,
  });
  mat.iCol = colors.length;
  mat.name = col;
  colors.push(mat);
  return mat;
}

Way.prototype.Fence = function (material, h) {
  if (!h) h = 1.4;
  var geometry = new THREE.BufferGeometry();
  var vertices = [];
  var faces = [];
  for (var n in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[n]];
    var x = node.x;
    var z = node.z;
    var mh = this.GetTag("min_height", 0, true) * 1;
    var h = this.GetTag("height", h, true) * 1 - mh;
    var t = this.GetTag("fence_type"); // todo
    if (t == "railing") material = mlm.grey;
    if (t == "concrete") material = mlm.white;
    if (t == "wood") material = mlm.amenity_brown;

    vertices.push(x, 0, z, x, h, z);
  }
  for (var n = 0; n < this.wayNodes.length - 1; n++) {
    var o = n * 2;
    faces.push(0 + o, 1 + o, 2 + o);
    faces.push(1 + o, 3 + o, 2 + o);

    /**
		 * geometry.setIndex([
   0,  1,  2,   2,  1,  3,  // front
   4,  5,  6,   6,  5,  7,  // right
   8,  9, 10,  10,  9, 11,  // back
  12, 13, 14,  14, 13, 15,  // left
  16, 17, 18,  18, 17, 19,  // top
  20, 21, 22,  22, 21, 23,  // bottom
]);
		 */
  }
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array([1, 1]), 2),
  );
  geometry.setIndex(faces);
  geometry.computeVertexNormals();

  if (FilterType > 1 && this.filter) material = FilterMaterial;

  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos + mh;
  mesh.osm = this;
  if (mesh.position.y >= +1.0) mesh.castShadow = shadow;
  if (mesh.position.y >= +1.0) mesh.receiveShadow = shadow;
  addMore(mesh, this.wayNodes[0]);
}; // Ende Fence

Way.prototype.Subway = function (material, radius, rund = 16) {
  if (llPos >= 0 && this.typeMain == "railway") {
    this.WaySC(mlm.black, 2.2, DrawDelta * 1, true); // Rand/Schienen
    this.WaySC(mlm.grey, 2.0, DrawDelta * 2); // Schwellen
    return;
  }

  var vectors = [];
  for (var n in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[n]];
    var x = node.x;
    var z = node.z;
    vectors.push(new THREE.Vector3(x, 0, z));
  }

  if (llPos == 0) if (this.GetTag("location") == "underground") llPos = -4;

  if (FilterType > 1 && this.filter) material = FilterMaterial;
  var curve = new THREE.CatmullRomCurve3(vectors);
  var geometry = new THREE.TubeGeometry(
    curve,
    this.wayNodes.length * 3 /*20*/,
    radius,
    rund /*16*/,
    false,
  ); // path, tubularSegments???pro Teiltück???, radius, radiusSegments, closed)
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos + radius / 2 + 0.2; // level is low in the tube but tic up, also for pipes
  mesh.osm = this;
  mesh.castShadow = false; // wirkt nicht???
  mesh.receiveShadow = false;
  var m = Math.floor(this.wayNodes.length / 2);
  add_Map(mesh, this.wayNodes[m]); // no shadow
}; // Ende Tube

Way.prototype.WaySC = function (material, radius, drawLevel, more, nodesType) {
  // Single-Color
  var geometries = [];
  var preNode;
  for (var n in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[n]]; //log('Way *** ' ,n,wayNodes.length-1)

    if (nodesType) {
      node.AddTag("natural", nodesType);
      node.Place();
    }

    // todo: gate NOT as way node but near: Fixit/checker  331873342
    if (node.idWay == 0 || node.idWay == this.id) {
      // this.id drawing way?
      node.idWay = this.id;

      var waterway;
      if ((waterway = node.GetTag("waterway"))) {
        node.typeMain = "!";
        var a = this.AngleAtNode(n);
        if (waterway == "weir")
          new NodeGeo()
            .box(radius * 2, 0.4, 1)
            .roty(a)
            .node(mlm.grey, node);
      }

      var valu;
      if ((valu = node.GetTag("ford"))) {
        node.typeMain = "!";
        var a = this.AngleAtNode(n);
        if (valu == "stepping_stones") {
          var x = new NodeGeo()
            .box(radius * 0.5, 0.4, 1)
            .trans(+radius * 0.4, 0, 0);
          new NodeGeo()
            .box(radius * 0.5, 0.4, 1)
            .trans(-radius * 0.4, 0, 0)
            .merge(x)
            .roty(a)
            .node(mlm.grey, node);
        }
      }

      var railway;
      if ((railway = node.GetTag("railway"))) {
        if (railway == "buffer_stop") {
          node.typeMain = "!";
          var a = this.AngleAtNode(n);
          new NodeGeo()
            .cyl(3, 3, 4, 3)
            .rotz(90)
            .roty(a + 180)
            .node(mlm.black, node);
        }
      }

      var barrier;
      if ((barrier = node.GetTag("barrier"))) {
        if (barrier == "gate" || barrier == "lift_gate") {
          node.typeMain = "!";
          var a = this.AngleAtNode(n);
          var d = 0.0001;
          if (barrier == "gate") d = 0.1;
          var left = new NodeGeo().box(d, 1.0, d).trans(+radius - 0.1, 0.5, 0);
          var right = new NodeGeo()
            .box(0.1, 1.0, 0.1)
            .trans(-radius + 0.1, 0.5, 0);
          new NodeGeo()
            .cyl(0.05, 0.05, radius * 2)
            .rotz(90)
            .trans(0, 1, 0)
            .merge(left)
            .merge(right)
            .roty(a)
            .node(mlm.grey, node);
        } //gate

        if (barrier == "cycle_barrier" || barrier == "cycle_barrier") {
          node.typeMain = "!";
          var a = this.AngleAtNode(n);
          var d = 0.05;
          var x1 = new NodeGeo().box(d, 1.0, d).trans(+radius, 0.5, +0.4);
          var x2 = new NodeGeo().box(d, 1.0, d).trans(0, 0.5, +0.4);
          var x3 = new NodeGeo().box(d, 1.0, d).trans(0, 0.5, -0.4);
          var x4 = new NodeGeo().box(d, 1.0, d).trans(-radius, 0.5, -0.4);
          var x5 = new NodeGeo()
            .box(radius + d, d, d)
            .trans(+radius / 2, 1, +0.4);
          new NodeGeo()
            .box(radius + d, d, d)
            .trans(-radius / 2, 1, -0.4)
            .merge(x1)
            .merge(x2)
            .merge(x3)
            .merge(x4)
            .merge(x5)
            .roty(a)
            .node(mlm.grey, node);
        } //gate
      } //barriere

      var traffic_calming;
      if ((traffic_calming = node.GetTag("traffic_calming"))) {
        node.typeMain = "!";
        if (traffic_calming == "bump") {
          var a = this.AngleAtNode(n);
          new NodeGeo()
            .plane(radius * 2, 0.5)
            .rotx(90)
            .trans(0, 0.3, 0)
            .roty(a)
            .node(mlm.yellow, node);
        }
      }
    } //firstway

    var gNode = node.Highway(this.id, radius, drawLevel);
    if (gNode != null) {
      geometries.push(gNode);
    }
    if (n > 0) {
      var gRect = this.RectangleGeometry(
        preNode.x,
        preNode.z,
        node.x,
        node.z,
        radius,
        drawLevel,
      );
      if (gRect) geometries.push(gRect);
    }
    preNode = node;
  }
  if (FilterType > 1 && this.filter) material = FilterMaterial;
  if (geometries.length == 0) {
    err("merge1");
    return;
  }
  var geometry = BufferGeometryUtils.mergeGeometries(geometries, false);
  //r geometry = BufferGeometryUtils.mergeGroups(geometry)
  var matrix = new THREE.Matrix4();
  matrix.makeRotationX(g(90));
  geometry.applyMatrix4(matrix);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos + drawLevel;
  mesh.osm = this;
  if (more) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  } else {
    if (mesh.position.y >= +1.0) mesh.castShadow = shadow;
    if (mesh.position.y >= -0.0) mesh.receiveShadow = shadow;
  }

  if (more) addMore(mesh, this.wayNodes[0]);
  else add_Map(mesh, this.wayNodes[0]);
}; // Ende WaySC

Way.prototype.GetLL = function (do0) {
  // get hight by level or layer
  var level = this.GetTag("level", false, true);
  var layer = this.GetTag("layer", false, true);
  if (level) return level.replace(",", "."); // may also be "0;1" !
  if (layer) return layer.replace(",", "."); // decimal point!
  if (do0 == 0) return 0;
  return false;
};

Way.prototype.Steps = function () {
  //// Steps Steps Steps Steps Steps Steps Steps Steps Steps Steps Steps Steps Steps

  // The two beginning and end Step-Levels are definde by the first/last node or the ways, this nodes belong to

  var level0 = "";
  var level1 = "";
  var node0 = nodes[this.wayNodes[0]];
  var node1 = nodes[this.wayNodes[this.wayNodes.length - 1]];

  // http://localhost:5173/index.html?km=1&lat=49.72224592&lon=11.11486072&ele=80.76&dir=50&view=-64&user=karlos&dbg=0&con=1&id=907519435&tiles=0&opt=0
  //var box = new Mesh(new BoxGeometry(9, 9, 9))
  //box.position.x = node0.x
  //box.position.z = node0.z
  //scene.add(box)

  // If the node has no level, try its other way
  var ll = node0.GetLLm();
  if (ll != false) level0 = ll;
  if (level0 == "") {
    var way = ways[node0.idWay];
    if (way) {
      var ll = way.GetLL();
      if (ll != false) level0 = ll * levelHeight;
    }
  }
  var ll = node1.GetLLm();
  if (ll != false) level1 = ll;
  if (level1 == "") {
    var way = ways[node1.idWay];
    if (way) {
      var ll = way.GetLL();
      if (ll != false) level1 = ll * levelHeight;
    }
  }

  if (level0 == "" && level1 == "") {
    // Nothing found yet: check own tag
    //	Steps could also have two values in the level tag for the first and the last node.
    //	If there is only one level (default=0) the tag incline (default=up?) should indicate the direction _to_ this level
    //	If the way has more than 2 nodes, an interpolation is needed (still ToDo)

    var incline = this.GetTag("incline", false);

    if (!incline) {
      incline = 0;
    } else incline = incline == "up" ? 1 : -1;

    var ll = this.GetLL();
    if (ll == false) ll = "0;" + incline;
    else ll = ll.toString();

    var lls = ll.split(";");
    if (lls.length < 2) {
      err("steps without two level: " + this.id, this); // @info   -- if( !(this.GetTag("count")<7) )
      if (incline > 0)
        // up to this
        lls = [ll * 1, ll * 1 - incline * 1]; // down to this
      else lls = [ll * 1, ll * 1 + incline * 1];
      incline = 0;
    }
    // log("steps local level: ",this.id,level,incline)

    if (incline < 0) {
      var level0 = lls[1] * levelHeight;
      var level1 = lls[0] * levelHeight;
    } else {
      var level0 = lls[0] * levelHeight;
      var level1 = lls[1] * levelHeight;
    }

    /***
				var level = this.GetTag("level",false)
				if(!level) {
					level = "0;"+incline
				}
				var levels = level.split(';')
				if(levels.length<2) {
					err("steps without two level: "+this.id)
					if(incline>0) // up to this
						levels  = [level*1,level*1-incline*1]
					else // down to this
						levels  = [level*1,level*1-incline*1]
					incline = 0
				}
				// log("steps local level: ",this.id,level,incline)

				if(incline<0) {
					var level0 = levels[1] * levelHeight
					var level1 = levels[0] * levelHeight
				} else {
					var level0 = levels[0] * levelHeight
					var level1 = levels[1] * levelHeight
				}
		***/
  }

  if (level0 == "") level0 = 0;
  if (level1 == "") level1 = 0;

  var x0 = node0.x;
  var z0 = node0.z;
  var x2 = node1.x;
  var z2 = node1.z;
  var x = x0 - x2;
  var z = z0 - z2;
  var a = Math.atan2(x, z); // Angle
  var sc = SinCos(a, 0.7);

  if (x == 0 && z == 0) {
    // i.e.: 4256955
    // terr("End-Step-Nodes in line at the same place! Area? "+this.id,this)
    if (this.GetTag("area") != "no") {
      this.Shape(mlm.steps, level0 + DrawDelta * 6 + 1);
      return;
    }

    return null;
  }

  if (level0 == level1) {
    llPos = 0;
    this.WaySC(mlm.steps, 0.7, level0 + DrawDelta * 6, false);
    return;
  }

  /// file:///C:/Users/adadka1/desktop/act/index.html?lon=11.081807018787698&lat=49.44684675203797&rad=55

  var geometry = new THREE.BufferGeometry();
  var vertices = [];
  var faces = [];
  vertices.push(x0 + sc[1], level0 + DrawDelta * 6, z0 - sc[0]);
  vertices.push(x0 - sc[1], level0 + DrawDelta * 6, z0 + sc[0]);
  vertices.push(x2 - sc[1], level1 + DrawDelta * 6, z2 + sc[0]);
  vertices.push(x2 + sc[1], level1 + DrawDelta * 6, z2 - sc[0]);
  faces.push(0, 1, 2);
  faces.push(0, 2, 3);
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array([1, 1]), 2),
  );
  geometry.setIndex(faces);
  geometry.computeVertexNormals();

  var material;
  if (FilterType > 1 && this.filter) material = FilterMaterial;
  else material = mlm.steps;

  var mesh = new THREE.Mesh(geometry, material);
  mesh.osm = this;
  if (mesh.position.y >= +1.0) mesh.castShadow = shadow;
  if (mesh.position.y >= +1.0) mesh.receiveShadow = shadow;
  add_Map(mesh, this.wayNodes[0]);
}; // Ende Steps

Way.prototype.RectangleGeometry = function (x1, y1, x2, y2, radius, drawLevel) {
  // Winkel feststellen, Punkte berechen, fläche erzeugen
  var x = x1 - x2;
  var y = y1 - y2;
  var a = Math.atan2(x, y); // Angle
  var sc = SinCos(a, radius);

  if (x == 0 && y == 0) {
    terr("Two way-Nodes in line at the same place!!! " + this.id, this);
    return null;
  }

  var points = [];
  points.push(new THREE.Vector2(x2 - sc[1], y2 + sc[0]));
  points.push(new THREE.Vector2(x2 + sc[1], y2 - sc[0]));
  points.push(new THREE.Vector2(x1 + sc[1], y1 - sc[0]));
  points.push(new THREE.Vector2(x1 - sc[1], y1 + sc[0]));
  var shape = new THREE.Shape(points);
  var geometry = new THREE.ShapeGeometry(shape);
  var matrix = new THREE.Matrix4();
  return geometry;
  //	log("RG:",x1,x2,y1,y2,radius, drawLevel, points)
};

Way.prototype.AnalyseWay = function (width) {
  for (var n in this.wayNodes) {
    // Jede Node ..
    if (this.id == 467451045) log("way AnalyseWay");
    var node = nodes[this.wayNodes[n]];
    if (!node) terr("AnalyseWay: bäh! " + this.id, this);
    else node.AnalyseWay(this.id, width);
  }
}; // Ende AnalyseWay

Way.prototype.WayWidth = function (type) {
  switch (type) {
    case "motorway":
    case "trunk":
    case "primary":
      return 4;

    case "secondary":
    case "motorway_link":
    case "primary_link":
    case "trunk_link":
    case "road":
      return 3.5;

    case "raceway":
    case "secondary_link":
    case "tertiary":
      return 3;

    case "tertiary_link":
    case "residential":
    case "living_street":
      return 2.5;

    case "service":
    case "services":
    case "abandoned":
    case "pedestrian":
    case "unclassified":
    case "crossing":
      return 1.5; // Zebrastreifen anders ??

    case "track":

    case "footway":
    case "cycleway":
    case "path":
      return 1;

    case "cemetery":
      return 0.25;

    default:
      return 0;
  }
}; // WayWidth

Way.prototype.Info = function () {
  /*with (this)*/ {
    tagNames = this.tags.slice(); // copy!
    tagInfos = [];

    if (this.tags.length == 0) return tagInfos.push("- No tags -");

    this.Tag(this.typeMain);
    this.Tag("name");
    this.Tag("description", 0);
    this.Tag("area", -1);

    var addr = false;
    for (var t in this.tags)
      if (this.tags[t].indexOf("addr:") == 0) addr = true;
    if (addr) {
      this.Tag("addr:housenumber", 0);
      this.Tag("addr:housename", 0);
      this.Tag("addr:street", 2);
      this.Tag("addr:place", 2);
      this.Tag("addr:postcode", 0);
      this.Tag("addr:city", 2);
      this.Tag("addr:country", 2);
      this.Tag("addr:state", 2);
      this.Tag("addr:suburb", 0);
    }

    while (tagNames.length > 0) this.Tag(tagNames[0]);
    return tagInfos;
  }
}; // Info

Way.prototype.Tag = function (tag, show) {
  if (show == undefined) show = 1;
  var val = false;
  for (var t in this.tags) if (this.tags[t] == tag) val = this.values[t];

  if (val) {
    if (show == 0) tagInfos.push(val);
    if (show == 1) tagInfos.push(tag + ":" + val);
    if (show == 2) {
      tagInfos[tagInfos.length - 1] += " " + val;
    }
    tagNames.splice(tagNames.indexOf(tag), 1);
  }
};

Way.prototype.railway = function (type) {
  switch (type) {
    case "loading_ramp":
    case "platform":
    case "platform_edge":
      WayOrShape(this, mlm.grey, DrawDelta * 3, 0.5);
      break;

    case "subway":
      this.Subway(mlm.grey1, levelHeight / 2);
      break; // Diameter not > as level heigt!

    case "narrow_gauge":
      var gauge = this.GetTag("gauge", 1);
      if (gauge > 3) gauge /= 1000;
      this.WaySC(mlm.grey1, gauge, DrawDelta * 2);
      break; // Schmalspurbahn

    case "construction":
      this.WaySC(mlm.landfill, 2.2, DrawDelta * 2);
      break; // Schwellen

    case "abandoned":
    case "disused":
      this.WaySC(mlm.black1, 2.2, DrawDelta * 1, true); // Rand/Schienen
      this.WaySC(mlm.green, 2.0, DrawDelta * 2);
      break; // Schwellen

    case "razed":
      this.WaySC(mlm.blackT, 2.0, DrawDelta * 2);
      break; // (Schwellen)

    case "funicular":
      this.WaySC(mlm.blue, 2.2, DrawDelta * 1, true); // Rand/Schienen
      this.WaySC(mlm.grey1, 2.0, DrawDelta * 2);
      break; // Schwellen
    case "rail":
      this.WaySC(mlm.black1, 2.2, DrawDelta * 1, true); // Rand/Schienen
      this.WaySC(mlm.grey1, 2.0, DrawDelta * 2);
      break; // Schwellen

    case "light_rail":
      this.WaySC(mlm.grey1, 1.5, DrawDelta * 2);
      break;
    case "tram":
      this.WaySC(mlm.grey1, 1, DrawDelta * 2);
      break;
    case "miniature":
      this.WaySC(mlm.grey1, 0.5, DrawDelta * 2);
      break;

    case "without_tags":
      if (dbg > 5) log("highway", type, this.id, this.tags, this.values);
      return;

    case "monorail":
      this.Subway(mlm.grey1, 1 /*radius*/, 3 /*ecken*/);
      break;

    default:
      this.WaySC(mlm.red, 1.5, DrawDelta * 2);
      break;
      return;
  }
}; // railway

Way.prototype.highway = function (type) {
  // hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh hhh

  if (this.id == 217154992) log("highway found");

  if (type == "elevator") {
    this.Building(mlm.buildingIndoor);
    return;
  }
  if (type == "steps") {
    this.Steps();
    return;
  } // Stufen!   footway-fill => salmon
  if (type == "disused") {
    this.WaySC(mlm.grey, 1.5, 0, 0);
    return;
  }
  if (type == "bus_stop") {
    this.Shape(mlm.grey, 0);
    return;
  }
  if (type == "rest_area") {
    this.Shape(mlm.rest_area, 0);
    return;
  }
  if (type == "construction") {
    this.WaySC(mlm.construction, 2, 0);
    return;
  }
  if (type == "proposed") {
    this.WaySC(mlm.yellow, 2, 0);
    return;
  }
  if (type == "bridleway") {
    this.WaySC(mlm.green, 1, 0);
    return;
  }
  if (type == "abandoned") {
    this.WaySC(mlm.black, 1.5, 0);
    return;
  }
  if (type == "path") {
    if (this.GetTag("bicycle") != "no") {
      WayOrArea(this, mlm.footway, DrawDelta * 2.5, 1.0);
      return;
    } else {
      WayOrArea(this, mlm.blue, DrawDelta * 2.5, 1.0);
      return;
    }
  }

  if (type == "traffic_island") {
    this.Shape(mlm.grey, DrawDelta * 2);
    return;
  }
  if (type == "platform") {
    WayOrShape(this, mlm.grey, DrawDelta * 3, 0.5);
    return;
  }
  if (type == "pedestrian") {
    WayOrArea(this, mlm.grey, DrawDelta * 2, 0.5);
    return;
  }

  var width = this.WayWidth(type);
  var add = (width / 4) * DrawDelta;

  if (width == 0) {
    this.WaySC(mlm.red, 2, 0);
    if (dbg > 5) log("highway", type, this.id, this.tags, this.values);
    return;
  }

  var col = mlm.white1;
  switch (type) {
    case "motorway_link":
    case "motorway":
      col = mlm.motorway;
      break;
    case "raceway":
      col = mlm.raceway;
      break;
    case "trunk_link":
    case "trunk":
      col = mlm.trunk;
      break;
    case "primary_link":
    case "primary":
      col = mlm.primary;
      break;
    case "secondary_link":
    case "secondary":
    case "tertiary_link":
    case "tertiary":
      col = mlm.secondary;
      break;

    case "track":
      col = mlm.track;
      break;
    case "footway":
      col = mlm.footway;
      break;
    case "cycleway":
      col = mlm.blue;
      break; // lit=yes  Lampen hinstellen??
  }

  if (type == "footway") {
    WayOrArea(this, mlm.footway, DrawDelta * 2.5, 1.0);
    return;
  }

  // Beides über Wasserwegen

  //  if( this.GetTag("area")!="no"

  if (width > 2.5)
    //		        this.WaySC(mlm.black, width*1.2, add+DrawDelta*3,false)	    // Rand/Gesteig
    WayOrArea(this, mlm.black, add + DrawDelta * 3, width * 1.2); // Rand/Gesteig
  //	if( this.GetTag("area")!="no" /*&& this.wayNodes.length<8*/ )
  WayOrArea(this, col, add + DrawDelta * 4, width); // Straße
  //	else this.WaySC(               col, width    , add+DrawDelta*4,false)	// Straße
}; // highway

Way.prototype.memorial = function (type) {
  this.Building(mlm.pl_o_worship);
};

Way.prototype.building = function (type) {
  // Main-Tag type switch funktion
  if (type == "yes") {
    if ((subType = this.GetTag("amenity"))) type = subType;
  }

  switch (type) {
    case "church":
    case "cathedral":
    case "place_of_worship":
      this.Building(mlm.pl_o_worship);
      break;
    case "construction":
      this.Building(mlm.construction);
      break;
    case "no":
      this.typeMain = undefined;
      break; // Crasy but happends: It IS a building main tag, but with "no". So undo "found main tag"

    default:
      this.Building(mlm.building);
      break; // bbb
  }
}; // building

Way.prototype.leisure = function (type) {
  var p1 = +DrawDelta * 1;
  var p4 = +DrawDelta * 4;
  var p5 = +DrawDelta * 5;
  var d1 = -DrawDelta * 1; // 1,2
  var d2 = -DrawDelta * 2; // 1,2
  switch (type) {
    case "forest":
      this.Shape(mlm.forest, d2);
      break;
    case "industrial":
      this.Shape(mlm.industrial, d2);
      break;
    case "landfill":
      this.Shape(mlm.landfill, d2);
      break;
    case "park":
      this.Shape(mlm.park, d2);
      break;
    case "sports_centre":
    case "golf_course":
      this.Shape(mlm.scrub, d2);
      break;
    case "pitch":
      this.Shape(mlm.pitch, p5);
      break;
    case "outdoor_seating": // nicht in Standard
    case "swimming_pool":
    case "water_park":
    case "stadium":
    case "fitness_station":
    case "playground":
      this.Shape(mlm.playground, p4);
      break;
    case "track":
      WayOrShape(this, mlm.track, p1, 3);
      break;
    case "garden":
    case "meadow":
      this.Shape(mlm.grass, d2);
      break;
    case "marina":
      this.Shape(mlm.water, d2);
      break; //?? color ok??

    case "nature_reserve":
      break; // nicht darstellen, da ist ein Rand: https://www.openstreetmap.org/way/96409076#map=17/49.58550/11.02550

    default:
      this.Shape(mlm.amenity_brown, d2);
      if (dbg > 5) log("leisure", type, this.id, this.tags, this.values);
      break;
  }
}; // leisure

Way.prototype.natural = function (type) {
  var p1 = +DrawDelta * 1;
  var d1 = -DrawDelta * 1;
  var d2 = -DrawDelta * 2;
  var d3 = -DrawDelta * 3;
  switch (type) {
    case "sand":
      this.Shape(mlm.sand, p1);
      break;
    case "wood":
      this.Shape(mlm.forest, d1);
      break;
    case "mud":
      this.Shape(mlm.mud, d1);
      break;
    case "beach":
    case "scrub":
      this.Shape(mlm.scrub, d1);
      break;
    case "wetland":
    case "wetland_wet_meadow":
    case "wetland_marsh":
    case "grasland":
      this.Shape(mlm.grass, d2);
      break;
    case "shingle":
      this.Shape(mlm.bare_ground, d2);
      break;
    case "bay":
    case "spring":
    case "hot_spring":
    case "geyser":
    case "water":
      this.Shape(mlm.water, d1);
      break;
    case "slope":
    case "coastline":
      WayOrShape(this, mlm.sand, d3, 0.75);
      break;
    case "heath":
      this.Shape(mlm.heath, d2);
      break;
    case "scree":
    case "bare_rock":
    case "glacier":
      this.Shape(mlm.grey, d1);
      break;
    case "grass":
    case "grassland":
      this.Shape(mlm.grass, d2);
      break;

    // cape=landzunge

    //   highway 	rest_area = nicht gerendert

    case "tree_row":
      WayOrShape(this, mlm.grass, d2, 0.75, "tree");
      return;
    case "cliff":
      WayOrShape(this, mlm.grey1, d2, 0.75, "cliff");
      return;

    default:
      WayOrShape(this, mlm.red, d1, 2);
      break;
  }
}; // leisure

function WayOrArea(way, mat, dl, ra, nodeType) {
  if (
    way.wayNodes[0] == way.wayNodes[way.wayNodes.length - 1] &&
    way.GetTag("area", "no") != "no"
  )
    way.Shape(mlm.bright, dl + 0.1 * DrawDelta /*-DrawDelta*2*/); // grau! https://www.openstreetmap.org/way/124547968#map=19/40.63901/-75.54674
  else way.WaySC(mat, ra, dl, undefined, nodeType);
}

function WayOrShape(way, mat, dl, ra, nodeType) {
  // sss
  if (
    way.wayNodes[0] == way.wayNodes[way.wayNodes.length - 1] &&
    way.GetTag("junction") != "roundabout"
  )
    // Area but no roundabout
    way.Shape(mat, dl - DrawDelta * 2); //mlm.bright
  else way.WaySC(mat, ra, dl, undefined, nodeType); //ddd
  //  WaySC(material,radius,drawLevel,other,trees) { // Single-Color
}

Way.prototype.amenity = function (type) {
  var dl = +DrawDelta * 2.3; // 3,4
  switch (type) {
    case "bench":
      WayOrShape(this, mlm.yellow, 0.5, 0.5);
      break;

    case "restaurant":
      this.Shape(mlm.buildingPlus, dl);
      break;
    case "fountain":
      this.Shape(mlm.waterB, dl);
      break;
    case "sport":
      this.Shape(mlm.dblau, dl);
      break;

    case "motorcycle_parking":
    case "bicycle_parking":
    case "parking":
      WayOrShape(this, mlm.parking, dl - DrawDelta, 1);
      break;
    //	this.Shape(mlm.parking,           dl-DrawDelta)    ;break
    case "garages":
      this.Shape(mlm.garages, dl);
      break;

    case "university":
      this.Shape(mlm.school, -DrawDelta * 7);
      break; //ddd

    case "college":
    case "kindergarten":
    case "school":
      this.Shape(mlm.school, dl);
      break;
    case "place_of_worship":
      this.Shape(mlm.pl_o_worship, dl);
      break;

    default:
      this.Shape(mlm.amenity_brown, dl);
      if (dbg > 5) log("amenity", type, this.id, this.tags, this.values);
      break;
  }
}; // amenity

Way.prototype.aeroway = function (type) {
  var d2 = +DrawDelta * 6;
  var dw = +DrawDelta * 5;
  var da = -DrawDelta * 0; // 4??
  var d7 = -DrawDelta * 7;
  switch (type) {
    // https://www.openstreetmap.org/way/1224899870#map=19/46.230083/14.455143
    //case "jet_bridge":
    //	this.AddTag("levels", "0.98");
    //	this.AddTag("min_level", "0.90");
    //	this.Building(mlm.grey); break

    case "aerodrome":
      this.Shape(mlm.airprot, d7);
      break;
    case "apron":
      this.Shape(mlm.apron, d7);
      break;
    case "beacon":
      WayOrShape(this, mlm.yellow, dw, 1.5);
      break;
    case "runway":
      WayOrShape(this, mlm.aeroway, dw, 18.0);
      WayOrShape(this, mlm.yellow, d2, 0.5);
      break;
    case "taxilane":
    case "taxiway":
      WayOrShape(this, mlm.aeroway, dw, 6.0);
      WayOrShape(this, mlm.yellow, d2, 0.5);
      break;
    case "stand":
    case "parking_position":
      WayOrShape(this, mlm.yellow, d2, 0.5);
      break;

    case "aerodrome traffic circuit":
      /* Immaginärer Weg in der Luft? */ break;

    default:
      WayOrShape(this, mlm.red, dw, 4); // common
      if (dbg > 5) log("aeroway", type, this.id, this.tags, this.values);
      break;
  }
}; // aeroway

Way.prototype.landuse = function (type) {
  var dl = -DrawDelta * 6; // 5,6,7
  var d2 = -DrawDelta * 7;
  switch (type) {
    case "residential":
      this.Shape(mlm.residential, dl - DrawDelta);
      break;

    case "port":
    case "industrial":
      this.Shape(mlm.industrial, dl - DrawDelta);
      break;

    case "highway":
    case "traffic_island":
      this.Shape(mlm.grey, DrawDelta * 2);
      break;

    case "landfill":
      this.Shape(mlm.landfill, dl);
      break;

    case "education":
    case "university":
    case "school":
      this.Shape(mlm.school, dl);
      break;

    case "allotments":
      this.Shape(mlm.allotments, dl);
      break;
    case "raceway":
    case "yard":
    case "vineyard":
    case "orchard":
      this.Shape(mlm.orchard, dl);
      break;
    case "cemetery":
      this.Shape(mlm.cemetery, dl);
      break;
    case "commercial":
      this.Shape(mlm.commercial, dl);
      break;
    case "farm":
    case "farmland":
      this.Shape(mlm.farmland, dl);
      break;
    case "garages":
      this.Shape(mlm.garages, dl);
      break;

    case "plant_nursery": // unknown in carto
    case "orchad": // unknown in carto
    case "greenfield": // unknown in carto
    case "farmyard":
      this.Shape(mlm.farmyard, dl);
      break;
    case "trees":
    case "wood":
    case "forest":
      this.Shape(mlm.forest, dl);
      break;
    case "green": // TAG ERROR???
    case "brownfield":
    case "railway":
    case "meadow":
      this.Shape(mlm.grass, dl);
      break;

    case "winter_sports":
      this.Shape(mlm.residential, d2);
      break; // not rendered by standard

    case "runway":
      this.Shape(mlm.aeroway, dl);
      break;
    case "aerodrome":
    case "airport":
      this.Shape(mlm.airport, d2);
      break;
    case "military":
      this.Shape(mlm.military, dl);
      break;
    case "quarry":
      this.Shape(mlm.quarry, dl);
      break;
    case "park":
      this.Shape(mlm.park, dl);
      break;
    case "religious":
      this.Shape(mlm.pl_o_worship, dl);
      break;
    case "retail":
      this.Shape(mlm.retail, dl);
      break;
    case "civic_admin":
    case "civic": // unknown in carto
    case "government": // unknown in carto
    case "pedestrian":
    case "bare_rock":
    case "plaza":
      this.Shape(mlm.grey, dl);
      break;

    case "churchyard":
    case "courtyard":
    case "recreation_ground":
      this.Shape(mlm.societal_am, dl);
      break;

    case "village_green":
    case "garden":
    case "greenhouse_horticulture":
    case "grassland":
    case "grass":
      this.Shape(mlm.grass, dl + DrawDelta);
      break;
    case "pond":
    case "basin":
    case "reservoir":
      this.Shape(mlm.water, dl + DrawDelta);
      break;
    case "depot":
    case "construction":
      this.Shape(mlm.construction, dl + DrawDelta);
      break; // https://www.openstreetmap.org/way/255155602

    // https://wiki.openstreetmap.org/wiki/DE:Key:landuse?uselang=de
    // landuse garage     animal_enclosure    graveyard
    // allotments, brownfield, cemetery  commercial
    //	"beach"  	observatory   	shingle

    case "civil": // Unknown by OSM
      this.Shape(mlm.no_osm, dl);
      break;

    case "harbour":
      break; // dont show??

    // user definded
    case "mixed":
      this.Shape(mlm.yellow, dl);
      break;

    default:
      this.Shape(mlm.red, dl); // common
      if (dbg > 5) log("landuse", type, this.id, this.tags, this.values);
      break;
  }
}; // landuse

Way.prototype.man_made = function (type) {
  switch (type) {
    case "embankment":
      WayOrShape(this, mlm.black, 0, 0.75, "cliff");
      return;
    case "obelisk":
      if (!this.GetTag("height", false, true)) this.AddTag("height", "15");
      this.Building(mlm.grey);
      break;
    case "tower":
      if (!this.GetTag("height", false, true)) this.AddTag("height", "22");
      this.Building(mlm.building);
      break;
    case "water_tower":
      if (!this.GetTag("height", false, true)) this.AddTag("height", "25");
      this.Building(mlm.building);
      break;
    case "chimney":
      if (!this.GetTag("height", false, true)) this.AddTag("height", "60");
      this.Building(mlm.industrial);
      break;
    case "campanile":
      this.Building(mlm.pl_o_worship);
      break;
    case "pumping_station":
      this.Building(mlm.industrial);
      break;
    case "wastewater_plant":
    case "works":
      this.Shape(mlm.industrial, 3 * DrawDelta);
      break;
    case "breakwater":
      WayOrShape(this, mlm.grey, 0, 1.44);
      break;
    case "pier":
      this.AddTag("levels", "0.98");
      this.AddTag("min_level", "0.90");
      this.Building(mlm.land);
      break;
    case "bridge":
      this.AddTag("levels", "0.98");
      this.AddTag("min_level", "0.90");
      this.Building(mlm.bridge);
      break;

    case "pipeline": // var diameter = this.GetTag("diameter",0.8)  //   >2.5    1.5-2.0
      this.Subway(mlm.red, 0.4 /*radius*/, 16 /*ecken*/);
      break;

    case "dyke":
      WayOrShape(this, mlm.red, 3, 3);
      break;

    case "cutline":
      WayOrArea(this, mlm.grass, DrawDelta * 3, 4.0);
      break; // Schneise

    default:
      this.Building(mlm.red);
      break;
  }
}; // power

Way.prototype.power = function (type) {
  var dl = -DrawDelta * 4;
  switch (type) {
    case "cable":
      this.PowerLine(mlm.grey, false);
      break;
    case "abandoned_line":
      this.PowerLine(mlm.yellow, true);
      break;
    case "line":
    case "minor_line":
      this.PowerLine(mlm.grey, true);
      break;
    case "plant":
    case "generator":
    case "substation":
      this.Shape(mlm.industrial, dl);
      break; // ToDo @power: darken(@industrial, 5%);

    default:
      this.Building(mlm.industrial);
      break;
  }
}; // power

Way.prototype.room = function (type) {
  var dl = 0;
  switch (type) {
    case "restaurant":
      this.Shape(mlm.commercial, dl, true);
      break;
    case "yes":
    case "shop":
      this.Shape(mlm.industrial, dl, true);
      break;
    case "toilets":
      this.Shape(mlm.societal_am, dl, true);
      break;
    case "corridor":
    case "entrance":
    case "pedestrian":
      this.Shape(mlm.grey, dl, true);
      break;
    default:
      this.Shape(mlm.red, dl, true);
      break;
  }
}; // power

Way.prototype.boundary = function (type) {
  switch (type) {
    case "water_protection_area":
      /* später dynamisch einschalten */ break;
  }
}; // boundary

Way.prototype.interpolation = function (type) {
  var h = levelHeight;
  var geometry = new THREE.BufferGeometry();
  var vertices = [];
  var faces = [];
  for (var n in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[n]];
    var x = node.x;
    var z = node.z;
    var material = mlm.building;

    vertices.push(x, 0, z, x, h, z);
  }
  for (var n = 0; n < this.wayNodes.length - 1; n++) {
    var o = n * 2;
    faces.push(0 + o, 1 + o, 2 + o);
    faces.push(1 + o, 2 + o, 3 + o);
  }
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array([1, 1]), 2),
  );
  geometry.setIndex(faces);
  geometry.computeVertexNormals();

  if (FilterType > 1 && this.filter) material = FilterMaterial;

  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos;
  mesh.osm = this;
  addMore(mesh, this.wayNodes[0]);
}; // addr:interpolation

Way.prototype.barrier = function (type) {
  switch (type) {
    case "jersey_barrier":
      WayOrShape(this, mlm.grey, 0, 0.75, "cliff");
      return;
    case "fence":
      this.Fence(mlm.yellow);
      break; // Drei ö OHNE Kommentar davor: CHROME meldet nichts! Tab-Frezze! FireFox=OK
    case "railing":
      this.Fence(mlm.black, 1.2);
      break;
    case "city_wall":
    case "wall":
      this.Fence(mlm.grey);
      break;
    case "kerb":
      this.Fence(mlm.grey, 0.3);
      break; // todo: Dicker
    case "guard_rail":
      this.Fence(mlm.grey, 0.6);
      break;
    case "bollard":
      this.Fence(mlm.blackT, 0.6);
      break;
    case "retaining_wall":
      WayOrShape(this, mlm.land, 0, 0.75, "cliff");
      return;
    //se "retaining_wall": this.Fence(mlm.white); break

    case "hedge":
      if (this.GetTag("area")) {
        if (!this.GetTag("height", false, true)) this.AddTag("height", "1");
        this.Building(mlm.green);
      } else this.Fence(mlm.green);
      break;

    default:
      this.Fence(mlm.red);
      break;
  }
}; // barrier

Way.prototype._keep = function (type) {
  switch (type) {
    default:
      if (dbg > 5) log("_keep", type, this.id, this.tags, this.values);
      break;
  }
}; // _keep

Way.prototype.waterway = function (type) {
  switch (type) {
    case "waterfall": // Nicht in "gravitystorm"
    case "drain":
    case "stream":
      this.WaySC(mlm.waterB, 2.0, 0);
      break;
    case "canal":
      this.WaySC(mlm.waterB, 10.0, 0);
      break;
    case "river":
      this.WaySC(mlm.waterB, 4.0, 0);
      break;
    case "riverbank":
      this.Shape(mlm.water, -DrawDelta);
      break;

    case "slipway":
      this.Shape(mlm.red, -DrawDelta);
      break;

    default:
      this.WaySC(mlm.waterB, 2, 0);
      if (dbg > 5) log("waterway", type, this.id, this.tags, this.values);
      break;
  }
}; // waterway

Way.prototype.DoTag = function (tagIsMethodName) {
  /*with (this)*/ {
    // Bei callback auf Klassen-Methoden muss die Instanz UND die Methode übergebenwerden. Da es hier aber das gleiche "this" ist, doch nicht :-)
    // Suche in den Tags, ob der gewünchte dabei ist. Wenn ja:
    // Rufe die Callback-Funktion/Methode der Instanz auf (wobei hier Tag-Name = Methoden-Name ist)
    // und übergebe dabei den Tag-Value = Unter-Typ
    //log("tagIsMethodName",tagIsMethodName)

    var tag = tagIsMethodName;
    if (tag == "interpolation") tag = "addr:interpolation";

    if (this.typeMain) return; // Wichtigerer Main-Tag wurde schon gefunden
    if ((subType = this.GetTag(tag))) {
      llPos = LlPos(this);

      this.typeMain = tagIsMethodName;
      this[tagIsMethodName](subType); // Hier muss das  this am Anfang bleiben!
      llPos = 0;
    }
  }
};

Way.prototype.Place = function () {
  {
    if (this.typeMain) return; // way already placed

    if (this.id * 1 == dbgOsmID) log("Debug Way Place, ID: ", this.id, this);
    else if (dbgReturn) return;

    if (this.tags.length < 1) {
      //if(dbg>6) err("Way without tags, ID: ",this.id)
      return;
      // AddTag("highway","without_tags") // Ersatzdarstellung als higheway
    }

    var mid;
    if ((mid = this.GetTag("3dmr"))) {
      //ööö
      //this.typeMain = "3dmr"   /// geetestet?
      //var node = nodes[this.wayNodes[0]]

      //// Copy in NODE-Code
      var node;
      var x = 0;
      var z = 0;
      for (var n in this.wayNodes) {
        // Jede Node ..
        var wayNode = nodes[this.wayNodes[n]];
        if (n == 0) {
          var node = new Node(0, 11, 22);
          node.tileX = wayNode.tileX;
          node.tileZ = wayNode.tileZ;
          node.tags = this.tags;
          node.values = this.values;
          continue;
        }
        x += wayNode.x;
        z += wayNode.z;
      }
      x /= this.wayNodes.length - 1;
      z /= this.wayNodes.length - 1;
      node.x = x;
      node.z = z;

      //		var dir = this.GetTag("direction",0)*1  // ToDo: Nicht erste WayNode sondern Mittelpunkt aller Nodes
      //		node.AddTag(          "direction",-dir)  // ToDo: realy   minus?
      //	return ddmr1(  node,mid)
      if (addRepo(node, mid)) {
        this.typeMain = "3dmr";
        node.typeMain = "3dmr";
        return;
      }
    }

    // !! Hier werden die Tags gesucht UND "indirekt" die Platzierungs-Methoden dazu aufgerufen
    // Building auch vor amenity, welches dann zweitattribut wird
    this.DoTag("building"); // Wenn Building, ist Power nur Hilfsinfo. Und was ist mit Weg/Fläche?
    var type;
    if (
      (type = this.GetTag("building:part")) &&
      !this.typeMain &&
      partView > 0
    ) {
      llPos = LlPos(this);
      this.building(type);
      this.typeMain = "building:part";
    }
    this.DoTag("room");
    this.DoTag("power");
    this.DoTag("memorial");
    /** 217144127 wird nicht sichbar, 562713285 doppelt! * /
			if( (GetTag("area:highway")) ) {
				WayTag("area:highway")
				if(!GetTag("area"))
					AddTag("area","yes")
			} /**/

    // Boden                  -8,9 oder 11?
    this.DoTag("landuse"); // -5 -6 -7    landuse VOR und unter leisure, falls beides getaggt ist, da es dann (auch) was größeres ist was tiefer muss
    this.DoTag("amenity"); // -3 -4
    this.DoTag("leisure"); // -1 -2      ddd DrawDelta
    this.DoTag("natural"); // -1 -2 -2?  NEW
    this.DoTag("waterway"); //  0-Ebene
    this.DoTag("highway"); // +3+4
    this.DoTag("railway"); // +1+2
    this.DoTag("aeroway"); // -5 areas / +4 wege
    this.DoTag("barrier"); //  %  nach higway, da es auch Wege-Hindernisse gibt: Treppen
    this.DoTag("boundary"); //  %
    this.DoTag("interpolation");
    this.DoTag("man_made");
    this.DoTag("_keep"); // ---

    if ((!this.typeMain && dbg > 5) || dbg > 8)
      log("PLACE ", this.typeMain, this.id, this.tags, this.values);
  }
}; // Place ------------------------------------

Way.prototype.Analyse = function () {
  // if(this.id==0000000)		log("Analyse-Way:",this.id)

  // highway
  if ((subType = this.GetTag("highway"))) {
    var width = this.WayWidth(subType);
    if (width > 0)
      // bekannter Weg-Typ
      this.AnalyseWay(width);
    return;
  }

  if ((subType = this.GetTag("building"))) {
    this.AnalyseWay(0);
    return;
  }

  if (this.GetTag("building:part")) {
    // und kein Building
    for (var n in this.wayNodes) {
      // Jede Node ..
      var node = nodes[this.wayNodes[n]];
      if (node) node.AnalysePart(this.id);
    }
  }
}; // Analyse  ------------------------------------

// Ende Way Klasse //////////

export function LlPos(obj) {
  var level = obj.GetTag("level", 0, true);
  var layer = obj.GetTag("layer", 0, true);

  if (level) {
    var le = level.split(";");
    if (le.length > 1) level = le[1];
  }
  if (layer) {
    var la = layer.split(";");
    if (la.length > 1) level = la[1];
  }

  if (Math.abs(layer * layerHeight) > Math.abs(level * levelHeight))
    var ll = layer * layerHeight;
  else var ll = level * levelHeight;

  if (isNaN(ll)) {
    log("llPos isNaN: " + obj.id);
    ll = 0;
  }
  return ll;
}
