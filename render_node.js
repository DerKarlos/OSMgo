import * as THREE from "three";
import { ways } from "./render_way.js";
import { lon2tileX, lat2tileY, GetLon2x, GetLat2z } from "./osm.js";
import { addRepo } from "./repo.js";
import { addGLB } from "./main.js";

import {
  gCustom,
  dbg,
  viewLevel,
  log,
  osmBnode_id,
  inc_osmBnode_id,
  DrawDelta,
  gAviation,
  camera,
  shadow,
  viewAbstr,
  windSpin,
  dbgOsmID,
  dbgReturn,
  mlm,
  defaultSpecies,
} from "./main.js";

import { ColourMaterial } from "./render_way.js";

import {
  FilterType,
  FilterString,
  FilterArray,
  maps,
  pockemon,
  levelHeight,
  layerHeight,
  NodeGeo,
  FilterMaterial,
} from "./render.js";

///////////////////////////////////////////////////////////////////////////////
////// Klasse: Node ///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

//// Contructor: Node //// nn4 nnnn
export var nodes = []; // Klassen-Konstante
export function reset_nodes() {
  nodes = [];
  nodeNeLaI = 0; // Init
  nodeNeLaP = 0; // Place
  nodeFirst = undefined;
  nodeCount = 0;
}
var nodeNeLaI = 0; // Init
export var nodeNeLaP = 0;
export function set_nodeNeLaP(v) {
  nodeNeLaP = v;
} // Place
export var nodeFirst = undefined;
export var nodeCount = 0;

var tagNames = false;
var tagInfos = false;

export function Node(id, lat, lon) {
  // nnnn iii
  if (id == 246519847 * 100) log("node:" + id);

  if (id == 0) {
    id = osmBnode_id;
    inc_osmBnode_id();
  }

  if (nodes[id]) {
    this.id = 0; // Wird auch als Kennung für "gibt es" genutzt
    return; // Rel war schon da
  }
  this.id = id;
  //if( nodes[id] )  return // Node war schon da
  this.id = id;
  if (gCustom == 2) {
    this.lat = lat;
    this.lon = lon;
  }
  this.tileX = lon2tileX(lon, viewLevel);
  this.tileY = lat2tileY(lat, viewLevel); // -z
  this.x = GetLon2x(lon, lat);
  this.z = GetLat2z(lat);
  this.deadEnd = false;
  this.idWay = 0; // Nur ein Weg darf die Node plazieren
  this.raWay = 0; // radius of way
  this.partWay = 0;
  this.tags = [];
  this.values = [];
  this.typeMain = undefined;
  this.filter = FilterType > 1; // Wegfiltern?!
  this.mesh = null;
  nodes[id] = this;
  if (nodeNeLaI) nodeNeLaI.next = this;
  nodeNeLaI = this;
  if (!nodeFirst) nodeFirst = this;

  if (dbg >= 5) log("new Node ", this.id, this.x, this.z);

  if (FilterString)
    if (this.id.toString().indexOf(FilterString) >= 0) {
      // includes() ??
      FilterArray.push(this);
      this.filter = false; // doch sichtbat
    }
  nodeCount++;
} //end constructor of Node

// ToDo; WayNode? Cycle max errechenen und NICHT doppelt "zeichnen"

Node.prototype.AddTag = function (tag, value) {
  if (this.tags === undefined) {
    log("tags MIST!nt", this, tag, value);
    return;
  }
  this.tags.push(tag);
  this.values.push(value);
  if (dbg > 5) log("Node:AddTag", this.tags.length, tag + ":" + value);

  if (FilterString)
    if (tag.indexOf(FilterString) >= 0 || value.indexOf(FilterString) >= 0) {
      FilterArray.push(this);
      this.filter = false; // doch sichtbat
    }
};

Node.prototype.DeadEnd = function () {
  this.deadEnd = true;
};

Node.prototype.AnalyseWay = function (idWay, radius) {
  // if(this.id==0000000)		log("node analyse")
  if (this.idWay == 0) this.idWay = idWay; // Node hat noch keinen Way-Zeichner
};

Node.prototype.AnalysePart = function (wayId) {
  if (!this.GetTag("shop")) this.partWay = wayId;
};

Node.prototype.Highway = function (idWay, radius, drawLevel) {
  //log('NodePl::', this.idWay, this.x, this.z, radius, drawLevel)
  //if(this.idWay== 0) { // Node hat noch keinen Way-Zeichner

  if (this.raWay < radius) {
    // Neuer Way ist breiter: neuer Zeichner
    this.idWay = idWay;
    if (this.raWay > 0) maps.remove(this.mesh); // If it is a way cycle  alte "Zeichnung" weg
  }
  if (this.idWay != idWay) return null; // Nur der "Zeichner" der Node darf
  if (this.deadEnd && pockemon) return null; // Nur Way-Ende-Node: nicht darstellen

  if (this.GetTag("highway") == "turning_circle") {
    radius *= 2;
    this.typeMain = "turning_circle";
  }

  this.raWay = radius;
  var geometry = new THREE.CircleGeometry(radius, 16);
  var m = new THREE.Matrix4().makeTranslation(this.x, this.z, 0);
  geometry.applyMatrix4(m);
  return geometry;
}; // End Highway

Node.prototype.GetTagNumber = function (tag, noNan) {
  // tttw weg damit wenn ungenutzt. Aber es kann so oft NaN kommen!
  for (var t in this.tags)
    if (this.tags[t] == tag) {
      var val = this.values[t];
      var ok = !(noNan && isNaN(val * 1));
      if (ok) return val * 1;

      var arr = val.split(" "); // if "nnn m" unit is m for meter: drop it
      if (arr.length > 1 && arr[1] == "m") {
        val = arr[0];
        if (!isNaN(val * 1)) return val * 1;
      }

      log("Real-Value (" + val + ") NaN? nodeid " + this.id);
      return false;
    }

  return false;
};

Node.prototype.GetTagDef = function (tag, defVal) {
  for (var t in this.tags) if (this.tags[t] == tag) return this.values[t];

  return defVal;
};

Node.prototype.GetTag = function (tag, defVal, noNan) {
  for (var t in this.tags)
    if (this.tags[t] == tag) {
      var val = this.values[t];
      var ok = !(noNan && isNaN(val * 1));
      if (ok) return val;
      log("Real-Value (" + val + ") NaN? nodeid " + this.id);
      if (!defVal) return false;
      defVal;
    }

  if (defVal) return defVal;
  else return false;
};

Node.prototype.GetTagStarts = function (tag) {
  for (var t in this.tags)
    if (this.tags[t].indexOf(tag) == 0)
      // found tag-name part at the left?
      return this.values[t];
    else return false;
};

Node.prototype.Tag = function (tag, show) {
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

Node.prototype.GetLLm = function () {
  // get hight by level or layer
  var level = this.GetTag("level");
  if (level) {
    var le = level.split(";");
    if (le.length > 1) level = le[le.length - 1];
    var le = level.split(",");
    if (le.length > 1) level = le[le.length - 1];
  }

  var layer = this.GetTag("layer");
  if (layer) {
    var la = layer.split(";");
    if (la.length > 1) level = la[la.length - 1];
    var la = layer.split(",");
    if (la.length > 1) level = la[la.length - 1];
  }

  var min_h = this.GetTag("min_height");
  var min_b = this.GetTag("building:min_height");

  if (min_h) return this.checkNaN(min_h) * 1;
  if (min_b) return this.checkNaN(min_b) * 1;
  if (level) return this.checkNaN(level) * levelHeight; // decimal point! @check: Are decimal commata ok?  OR IS IT A LIST ???
  if (layer) return this.checkNaN(layer) * layerHeight;
  return 0;
};

Node.prototype.checkNaN = function (val) {
  if (!isNaN(val)) return val;
  log("Node NaN! id:" + this.id);
  val.replace(",", ".");
  if (!isNaN(val)) return val;
  return 0;
};

Node.prototype.Info = function () {
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
      this.Tag("addr:housename", 0);
      this.Tag("addr:housenumber", 0);
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

Node.prototype.Entrance = function (a) {
  if (this.typeMain) return;
  this.typeMain = "++placed++"; // Dont place it again

  new NodeGeo()
    .box(0.04, 2.1, 1.4)
    .trans(0, 2.1 / 2, -0.04 / 2)
    .roty(a)
    .node(mlm.yellow, this);
};

export function NodeHouse(that) {
  if (Math.abs(that.x) > 1000) return;
  if (Math.abs(that.z) > 1000) return;
  var min = 99999;
  var nod = undefined;
  for (var i in nodes) {
    var n = nodes[i];
    if (!n.idWay) continue;
    if (!ways[n.idWay]) continue;
    if (!ways[n.idWay].GetTag("building")) continue;
    var d = Math.abs(that.x - n.x) + Math.abs(that.z - n.z);
    if (min > d) {
      min = d;
      nod = n;
    }
  }
  if (!nod) return;
  var way = ways[nod.idWay];
  if (!way.mesh) return;
  way.mesh.material = mlm.yellow;
}

Node.prototype.Place = function (angle) {
  //   nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn

  if (this.typeMain) return;
  this.typeMain = "+placed+"; // Dont place it again  ää

  if (this.id * 1 == dbgOsmID) log("Debug Node Place, ID: ", this.id, this);
  else if (dbgReturn) return;

  if (this.GetTag("GO-Note")) {
    if (
      gCustom == 2 && // Wien
      Math.abs(this.x) < 1000 && // Node in "sichtweite"
      Math.abs(this.z) < 1000
    ) {
      // Houses.push(this)	// später einfärben oder so
      var h = 2;
      var b = 1.6;
      var g = 14;
      var top = new NodeGeo().box(b, h, 0.001).trans(b / 2, g - h / 2, 0);
      return new NodeGeo()
        .cyl(0.08, 0.08, g)
        .trans(0, g / 2, 0)
        .merge(top)
        .node(mlm.yellow, this);
    }
    return new NodeGeo().sph(0.6).try2(0.6).node(mlm.yellow, this);
  }

  if (gCustom == 2) return; // Wien: sonst keine Nodes

  var mid;
  if ((mid = this.GetTag("3dmr"))) {
    //  if(gOptimize==0)
    if (addRepo(this, mid)) {
      log("addRepo ttt");
      this.typeMain = "3dmr";
      return;
    }
  }

  var public_transport = this.GetTag("public_transport");

  var leisure = this.GetTag("leisure");
  var natural = this.GetTag("natural");
  var barrier = this.GetTag("barrier");
  var power = this.GetTag("power");
  var railway = this.GetTag("railway"); // Mapper Eisenbahninfrastruktur: Micahel Reichert
  var highway = this.GetTag("highway");
  var amenity = this.GetTag("amenity");

  //var level = this.checkNaN(this.GetTagDef("level", 0)) * 1;
  var level = this.GetLLm();

  // if(this.GetTag("entrance"))  		if(this.idWay==0) return this.Entrance()

  if (this.GetTagStarts("information") == "guidepost") {
    var top = new NodeGeo().box(1.0, 0.2, 0.001).trans(0, 2 - 0.2 / 2, 0);
    return new NodeGeo()
      .cyl(0.04, 0.04, 2)
      .try2(2)
      .merge(top)
      .node(mlm.white, this);
  }

  if (this.GetTagStarts("man_made") == "flagpole") {
    var top = new NodeGeo().box(1, 2, 0.001).trans(1 / 2, 10 - 2 / 2, 0);
    return new NodeGeo()
      .cyl(0.08, 0.08, 10)
      .trans(0, 5, 0)
      .merge(top)
      .node(mlm.grey, this);
  }

  if (this.GetTagStarts("man_made") == "surveillance") {
    var top = new NodeGeo().sph(0.2).trans(0, 2.8, 0.0);
    return new NodeGeo()
      .box(0.05, 2.8, 0.05)
      .trans(0, 2.8 / 2, 0.0)
      .merge(top)
      .node(mlm.red, this);
  }

  if (this.GetTagStarts("man_made") == "chimney") {
    return new NodeGeo()
      .cyl(1.5, 2, 30)
      .trans(0, 30 / 2, 0.0)
      .node(mlm.industrial, this);
  }

  if (this.GetTagStarts("man_made") == "mast") {
    return new NodeGeo()
      .cyl(0.25, 0.25, 20)
      .trans(0, 20 / 2, 0.0)
      .node(mlm.black, this);
  }

  if (highway == "bus_stop" || public_transport == "platform") {
    var top = new NodeGeo().sph(0.2).trans(0, 2, 0.0);
    return new NodeGeo()
      .box(0.05, 2, 0.05)
      .trans(0, 2 / 2, 0.0)
      .merge(top)
      .node(mlm.yellow, this);
  }

  if (this.GetTag("historic") == "memorial") {
    if (this.GetTag("memorial:type") == "stolperstein")
      return new NodeGeo()
        .plane(0.3, 0.3)
        .rotx(90)
        .trans(0, DrawDelta * 6, 0.0)
        .node(mlm.red, this);
  }

  if (this.GetTag("historic") == "wayside_cross") {
    var top = new NodeGeo().box(1.5, 0.2, 0.2).trans(0, 1.5, 0.0);
    return new NodeGeo()
      .box(0.2, 2.0, 0.2)
      .trans(0, 2 / 2, 0.0)
      .merge(top)
      .node(mlm.grey, this);
  }

  if (this.GetTag("sport") == "gymnastics") {
    var right = new NodeGeo().box(0.1, 2.0, 0.1).trans(+0.7, 1.0, 0.0);
    var left = new NodeGeo().box(0.1, 2.0, 0.1).trans(-0.7, 1.0, 0.0);
    var mid = new NodeGeo().box(1.4, 0.1, 0.1).trans(0.0, 1.2, 0.0);
    return new NodeGeo()
      .box(1.4, 0.1, 0.1)
      .trans(0.0, 1.9, 0.0)
      .merge(right)
      .merge(left)
      .merge(mid)
      .node(mlm.red, this);
  }

  if (amenity)
    switch (
      amenity // You are missing the breaks? Its return this time  aaa aaa aaa aaa aaa aaa aaa aaa aaa aaa
    ) {
      case "bench":
        var dir = this.GetTag("direction", 0, true) * 1; // todo: Values like "NE"
        var right = new NodeGeo().box(0.1, 0.5, 0.6).trans(+0.6, 0.25, 0.0);
        var left = new NodeGeo().box(0.1, 0.5, 0.6).trans(-0.6, 0.25, 0.0);
        var bench = new NodeGeo()
          .box(1.5, 0.1, 0.6)
          .trans(0, 0.5, 0.0)
          .merge(right)
          .merge(left);
        if (this.GetTag("backrest") != "no")
          var bench = new NodeGeo()
            .box(1.5, 0.6, 0.05)
            .rotx(10)
            .trans(0, 0.5 + 0.6 / 2, 0.6 / 2 + 0.05)
            .merge(bench);
        return bench.roty(-dir).node(mlm.yellow, this);
      case "grit_bin":
        return new NodeGeo().box(1, 0.8, 0.8).try2(0.8).node(mlm.grey, this);
      case "waste_basket":
        return new NodeGeo()
          .cyl(0.25, 0.2, 0.6, 4)
          .try2(0.6)
          .node(mlm.grey, this);
      case "vending_machine": // ?? angle as the road near by!
        return new NodeGeo()
          .box(1.0, 1.8, 0.3)
          .try2(1.8)
          .node(mlm.yellow, this);
      case "atm":
        return new NodeGeo().box(1.0, 1.8, 0.3).try2(1.8).node(mlm.green, this);
      case "clock":
        var top = new NodeGeo()
          .cyl(0.4, 0.4, 0.3)
          .rotz(90)
          .trans(0, 1.6 + 0.4 / 2, 0.0);
        return new NodeGeo()
          .box(0.2, 1.6, 0.2)
          .try2(1.6)
          .merge(top)
          .node(mlm.yellow, this);
      case "table":
        return this.renderTable(mlm.red);
      case "telephone":
        return new NodeGeo().box(0.8, 2, 0.8).try2(2).node(mlm.blue, this);
      case "post_box":
        return new NodeGeo().box(0.6, 1.2, 0.4).try2(1.2).node(mlm.blue, this);
      case "parking":
      case "bicycle_parking":
      case "motorcycle_parking":
        return new NodeGeo()
          .plane(2, 2)
          .rotx(90)
          .trans(0, DrawDelta * 6, 0.0)
          .node(mlm.parking, this);
      case "recycling":
        var top = new NodeGeo().sph(0.6).trans(0, 1.0, 0);
        return new NodeGeo()
          .cyl(0.6, 0.6, 1)
          .try2(1)
          .merge(top)
          .node(mlm.yellow, this);
      case "fountain":
        var top = new NodeGeo().cyl(0.1, 0.05, 1.5).trans(0, 0.75, 0.0);
        return new NodeGeo()
          .cyl(1.0, 1.0, 0.3)
          .trans(0, 0.15, 0.0)
          .merge(top)
          .node(mlm.blue, this);
      case "public_bookcase":
        return new NodeGeo().box(0.4, 1.8, 1.0).try2(1.8).node(mlm.white, this);
      case "taxi":
        return new NodeGeo()
          .box(0.6, 0.6, 0.6)
          .rotx(45)
          .rotz(45)
          .trans(0, 1.5, 0)
          .node(mlm.yellow, this);
      case "drinking_water":
        return new NodeGeo().cyl(0.2, 0.2, 0.8).try2(0.8).node(mlm.blue, this);
      case "toilets":
        return new NodeGeo().box(1, 2, 1).try2(2).node(mlm.amenity_brown, this);
    } //amenity

  if (this.GetTag("tourism") == "artwork") {
    var top1 = new NodeGeo().box(1.0, 1.0, 0.2).try2(1);
    var top2 = new NodeGeo().box(0.2, 1.0, 1.0).try2(1);
    return new NodeGeo()
      .box(1.0, 0.2, 1.0)
      .try2(1)
      .merge(top1)
      .merge(top2)
      .node(mlm.grey, this);
  }

  if (
    this.GetTag("information") == "board" ||
    this.GetTag("tourism") == "information"
  ) {
    return new NodeGeo().box(0.05, 2, 1.0).try2(1).node(mlm.white, this);
  }

  if (this.GetTag("advertising") == "column")
    return new NodeGeo().cyl(0.7, 0.7, 3).try2(3).node(mlm.yellow, this);

  if (this.GetTag("highway") == "motorway_junction") {
    //mmmmm

    var text = "Exit ";
    var ref = this.GetTag("ref");
    var nam = this.GetTag("name");
    if (ref) text += ref;
    if (nam) text += ": " + nam;
    if (text == "Exit ") return;

    var px = 40;
    var canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024 / 8;
    var context = canvas.getContext("2d");
    context.font = "Bold " + px + "px Arial";

    var width = context.measureText(text).width;
    var style = "Bold ";

    context.fillStyle = "rgba(0,0,0,0.00)";
    context.fillRect(0, 0, width + 6, px + 6);
    context.fillStyle = "rgba(232,146,162,0.8)"; // 0xe892a2  e8 92 a2 = 232,146,162
    context.font = style + px + "px Arial"; // Bold Italic
    context.fillText(text, 0, px);

    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    var div = 5;

    var spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
    });
    var sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(this.x, 40, this.z);
    sprite.scale.set(canvas.width / div, canvas.height / div, 1); // 20cm pro Pixel * 52px = 5,2m
    maps.add(sprite);
    this.typeMain = "label";
    return;

    // return new NodeGeo().cyl(0.8,0.8,1.6,8).trans(0,30,0).node(mlm.motorway,this)
  }

  var place = this.GetTag("place");
  if (place) {
    var s = 6;
    switch (place) {
      case "municipality":
        s = 14;
        break;

      case "city":
        s = 12;
        break;

      case "town":
        s = 11;
        break;

      case "borough":
      case "village":
      case "suburb":
      case "neighbourhood":
        s = 9;
        break;
      case "quarter":
      case "city_block":
      case "hamlet":
      case "isolated_dwelling":
      case "square":
      case "plot":
        s = 8;
        break;
      case "farm":
      case "allotment":
      case "allotments":
      case "locality":
        s = 7;
        break;
    }

    var text = this.GetTag("name");

    if (!text) return;

    var h = 50 + s * 2;
    if (gAviation) h = camera.position.y;
    if (h < 50) h = 50;

    var px = 5.2 * s; // 52= 26=textPx * 2

    var canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024 / 8;
    var context = canvas.getContext("2d");
    context.font = "Bold " + px + "px Arial";

    var width = context.measureText(text).width;
    var style = "Bold ";
    if (s <= 6) style = "Italic ";

    context.fillStyle = "rgba(0,0,0,0.00)"; // dunkel, gut durchsichtig  HINGERGRUND <====
    context.fillRect(0, 0, width + 6, px + 6);
    context.fillStyle = "rgba(255,255," + s * 2 + ",0.8)"; // textColour
    if (s <= 6) context.fillStyle = "rgba(255,0,0,0.8)"; // rot = unbekannt
    context.font = style + px + "px Arial"; // Bold Italic
    context.fillText(text, 0, px);
    if (s >= 10) {
      context.fillRect(0, px * 1.2, width, px / 10);
    }

    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    var div = 5;
    if (gAviation) div = 2;

    var spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
    });
    var sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(this.x, h, this.z);
    sprite.scale.set(canvas.width / div, canvas.height / div, 1); // 20cm pro Pixel * 52px = 5,2m
    maps.add(sprite);
    //	sprite.osm    = node
    //	sprite.raycast = raycaster.intersectObjects
    //	node.mesh     = sprite
    this.typeMain = "label";
    return;
  }

  if (
    (this.GetTag("addr:postcode") && this.tags.length == 1) ||
    this.GetTag("uk_postcode_centroid")
  )
    return new NodeGeo()
      .cyl(6, 0, 2)
      .trans(0, 90, 0)
      .node(mlm.red, this, false, false);

  if (this.GetTag("communication:mobile_phone")) {
    var top = new NodeGeo().cyl(0.7, 0.7, 3.0, 3).trans(0, 20 + 3 / 2, 0.0);
    return new NodeGeo()
      .box(0.2, 20, 0.2)
      .try2(20)
      .merge(top)
      .node(mlm.blue, this);
  }

  if (this.GetTagStarts("traffic_sign")) {
    var top = new NodeGeo().box(0.7, 0.7, 0.01, 8).rotx(0).trans(0, 2.35, 0);
    return new NodeGeo()
      .box(0.07, 2.0, 0.07)
      .try2(2)
      .merge(top)
      .node(mlm.yellow, this);
  }

  if (highway)
    switch (
      highway // You are missing the breaks? Its return this time
    ) {
      case "street_lamp":
        var s = (this.GetTagDef("height", 2.6) * 1) / 2.6; // ergibt Scale-Faktor
        var top = new NodeGeo()
          .cyl(0.15 * s, 0.15 * s, 0.4 * s)
          .trans(0, 2.2 * s, 0.0);
        return new NodeGeo()
          .cyl(0.03 * s, 0.03 * s, 2.0 * s)
          .trans(0, 1.0 * s, 0.0)
          .merge(top)
          .node(mlm.grey, this);

      case "stop":
        var top = new NodeGeo()
          .cyl(0.8, 0.8, 0.01, 8)
          .rotx(90)
          .rotz(360 / 16)
          .trans(0, 2.4, 0.0);
        return new NodeGeo()
          .cyl(0.04, 0.04, 2.0)
          .trans(0, 1.0, 0.0)
          .merge(top)
          .node(mlm.red, this);
      case "give_way":
        var top = new NodeGeo()
          .cyl(0.8, 0.8, 0.01, 3)
          .rotx(90)
          .rotz(360 / 1)
          .trans(0, 2.4, 0.0);
        return new NodeGeo()
          .cyl(0.04, 0.04, 2)
          .try2(2)
          .merge(top)
          .node(mlm.white, this);

      case "crossing":
        if (this.GetTag("crossing") == "island")
          return new NodeGeo()
            .cyl(1.4, 1.8, 0.5)
            .trans(0, 0.3, 0.0)
            .node(mlm.grey, this);
        if (
          this.GetTag("crossing_ref") == "zebra" ||
          this.GetTag("crossing") == "zebra"
        ) {
          if (this.idWay == 0) var a = 0;
          else {
            var way = ways[this.idWay];
            var a = way.AngleAtNode(way.wayNodes.indexOf(this.id));
          }
          return new NodeGeo()
            .plane(this.raWay * 2, 2)
            .rotx(90)
            .roty(a)
            .trans(0, 0.3, 0)
            .node(mlm.grey, this, shadow, false);
        }
        return; //crossing
    } //switch highway

  var cycleway = this.GetTag("cycleway");
  if (cycleway) {
    if (cycleway == "asl") {
      if (this.idWay == 0) var a = 0;
      else {
        var way = ways[this.idWay];
        var a = way.AngleAtNode(way.wayNodes.indexOf(this.id));
      }
      return new NodeGeo()
        .plane(1, 2)
        .rotx(90)
        .roty(a)
        .trans(0, 0.3, 0)
        .node(mlm.green, this, shadow, false);
    }
  }

  if (
    highway == "traffic_signals" ||
    this.GetTag("crossing") == "traffic_signals"
  ) {
    var s = 0.4; // äää
    new NodeGeo()
      .box(s, s, s)
      .trans(0, 2.34 + s + s, 0.0)
      .node(mlm.red, this);
    new NodeGeo()
      .box(s, s, s)
      .trans(0, 2.32 + s, 0.0)
      .node(mlm.yellow, this);
    new NodeGeo().box(s, s, s).trans(0, 2.3, 0.0).node(mlm.green, this);
    //return new NodeGeo().box(s, s, s).trans(0, 2.30, 0.0).merge(r, 12).merge(y, 6).node(mlm.green, this)
    return;
  }

  if (this.GetTag("emergency") == "fire_hydrant") {
    var top = new NodeGeo().cyl(0.12, 0.12, 0.15).trans(0, 0.75, 0.0);
    return new NodeGeo()
      .cyl(0.08, 0.08, 0.9)
      .trans(0, 0.45, 0.0)
      .merge(top)
      .node(mlm.red, this);
  }

  if (this.GetTag("emergency") == "phone") {
    return new NodeGeo().box(0.4, 1.8, 0.3).try2(1.8).node(mlm.red, this);
  }

  if (railway == "signal") {
    var top = new NodeGeo().box(0.12, 0.5, 0.03).rotz(30).trans(0, 2, 0.0);
    return new NodeGeo()
      .box(0.08, 2.0, 0.08)
      .try2(2.0)
      .merge(top)
      .node(mlm.black, this);
  }

  if (railway == "milestone")
    return new NodeGeo()
      .plane(0.5, 0.5)
      .rotx(90)
      .trans(0, 0.2, 0.0)
      .node(mlm.white, this);

  if (railway == "subway_entrance") {
    if (this.idWay == 0) var a = 0;
    else {
      var way = ways[this.idWay];
      var a = way.AngleAtNode(way.wayNodes.indexOf(this.id));
    }
    return new NodeGeo()
      .box(1.8, 1.2, 5)
      .trans(0, 0, -2)
      .roty(a)
      .node(mlm.yellow, this);
  }

  if (barrier == "kerb") {
    if (this.idWay == 0) var a = 0;
    else {
      var way = ways[this.idWay];
      var a = way.AngleAtNode(way.wayNodes.indexOf(this.id));
    }
    return new NodeGeo()
      .plane(this.raWay * 2, 2)
      .rotx(90)
      .roty(a)
      .trans(0, 0.3, 0)
      .node(mlm.grey, this, shadow, false);
  }

  if (barrier == "bollard")
    return new NodeGeo()
      .cyl(0.08, 0.08, 1.2, 8)
      .trans(0, 1.2 / 2 + level * levelHeight, 0)
      .node(mlm.black, this);
  if (barrier == "barrier")
    return new NodeGeo()
      .cyl(0.08, 0.08, 1.2, 8)
      .trans(0, 1.2 / 2 + level * levelHeight, 0)
      .node(mlm.black, this);

  if (natural == "tree") {
    var mat = mlm.green;

    type == "palm" ||
      leaf_type == "palm" ||
      taxon_family == "Arecaceae" ||
      crown_type == "I";
    var type = this.GetTag("type");
    var leaf_type = this.GetTag("leaf_type");
    var taxon_family = this.GetTag("taxon:family");
    var crown_type = this.GetTag("crown_type");

    var species = this.GetTagDef("species", defaultSpecies);
    if (!species) var species = "";
    // if(species!="-") 			log("Three Species: "+species)
    /**
		if(species.indexOf("Prunus")  >=0 ) mat = mlm.white
		if(species.indexOf("Castanea")>=0 ) mat = mlm.amenity_brown
		if(species.indexOf("Cetrus")  >=0 ) mat = mlm.grey
		if(species.indexOf("Quercus") >=0 ) mat = mlm.yellow
		**/
    if (
      species.indexOf("Coniferous") >= 0 ||
      species.indexOf("Pinus") >= 0 || // 4210319500
      species.indexOf("Occidentalis") >= 0 // 4538585680
    ) {
      var scale = this.GetTag("height", 9) / 9; // ergibt Scale-Faktor
      // new NodeGeo().cyl(0.0, 2.0, 8).trans(0, 8 / 2 + 1, 0).scale(scale).node(mlm.green, /*****/ this)
      // new NodeGeo().cyl(0.2, 0.3, 1).trans(0, 1 / 2 + 0, 0).scale(scale).node(mlm.amenity_brown, this)
      // return
      var top = new NodeGeo().cyl(0.0, 2.0, 8).trans(0, 8 / 2 + 1, 0); // Nadelbaum  9m 	// cyl needs 3 colors: tube,top,bottom BUT!: I this groups are DELETED
      return new NodeGeo()
        .cyl(0.2, 0.3, 1)
        .trans(0, 1 / 2, 0)
        .merge(top, 1)
        .scale(scale)
        .node(mlm.green, this);
    } else if (
      species.indexOf("palm") >= 0 ||
      type == "palm" ||
      leaf_type == "palm" ||
      taxon_family == "Arecaceae" ||
      crown_type == "I"
    ) {
      // Palme
      // https://www.openstreetmap.org/node/2669684971
      // http://localhost:5173/index.html?lat=-26.334015&lon=-48.8502984&dir=0&view=-10&ele=101&multi=1&id=2669684971
      // https://overpass-turbo.eu
      // https://wiki.openstreetmap.org/wiki/Talk:Tag:natural%3Dtree#Tags_for_Palm_trees
      // https://www.openstreetmap.org/user/-karlos-/diary/406592#comment59146
      var scale = this.GetTag("height", 5) / 5;

      var points = [];
      points.unshift(new THREE.Vector2(+0.0, 0.0));
      points.unshift(new THREE.Vector2(+0.25, 0.5));
      points.unshift(new THREE.Vector2(+0.0, 1.0));
      points.unshift(new THREE.Vector2(-0.25, 0.5));
      //      points.unshift(new THREE.Vector2(+0.0, 0.0));
      //var blade1 = new NodeGeo().shape(points).rotx(20).rotz(a + 120)
      var h = 2;
      var w = 115;
      var b1 = new NodeGeo().shape(points).rotx(w).scale(scale);
      var b2 = new NodeGeo().shape(points).rotx(w).roty(+120).scale(scale);
      var b = new NodeGeo()
        .shape(points)
        .rotx(w)
        .roty(-120)
        .scale(scale)
        .merge(b1)
        .merge(b2)
        .trans(0, h, 0)
        .node(mlm.green, this);

      new NodeGeo()
        .cyl(0.04, 0.07, h)
        .trans(0, h / 2, 0)
        .scale(scale, scale, scale)
        .node(mlm.amenity_brown, this);

      return;
    } else {
      // brown green red

      var scale = this.GetTag("height", 5) / 5;

      // "Normaler" Baum mit Kugel
      new NodeGeo()
        .sph(1.5)
        .trans(0, 2 + 1.5 - 0.1, 0)
        .scale(scale)
        .node(mlm.green, this);
      new NodeGeo()
        .cyl(0.2, 0.3, 2)
        .trans(0, 2 / 2, 0)
        .scale(scale / 1.3, scale, scale / 1.3)
        .node(mlm.amenity_brown, this);
      //scale().  Ei wenn Specises gegeben?
      return;
    }
  }

  if (natural == "cliff")
    return new NodeGeo().cyl(0.0, 1.0, 1, 5).node(mlm.grey, this);

  if (power == "generator") {
    if (this.GetTag("generator:source") != "wind") return;
    if (dbg > 2) log("########### windrad", this.id);
    this.typeMain = "power";
    this.renderWindrad();
    return;
  }

  if (this.GetTagStarts("seamark"))
    return new NodeGeo().cyl(0, 0.5, 1).try2(0, 1, 0).node(mlm.blue, this);

  if (leisure == "picnic_table") {
    if (dbg > 2) log("########### picnic_table");
    this.typeMain = "leisure";
    this.renderCamping(mlm.yellow);
    return;
  }

  if (leisure == "playground") {
    var t1 = new NodeGeo().box(0.8, 0.8, 0.8).trans(-0.1, 0.8 * 4 + 0.4, 0.0);
    var t2 = new NodeGeo().box(0.8, 0.8, 0.8).trans(0.0, 0.8 * 3 + 0.4, -0.1);
    var t3 = new NodeGeo().box(0.8, 0.8, 0.8).trans(0.1, 0.8 * 2 + 0.4, 0.0);
    var t4 = new NodeGeo().box(0.8, 0.8, 0.8).trans(0.0, 0.8 * 1 + 0.4, 0.1);
    return new NodeGeo()
      .box(0.8, 0.8, 0.8)
      .trans(0.0, 0.8 * 0 + 0.4, 0.0)
      .merge(t1)
      .merge(t2)
      .merge(t3)
      .merge(t4)
      .node(mlm.red, this);
  }

  if (this.tags.length == 3) {
    if (
      this.tags[0] == "description" &&
      this.tags[1] == "layer" &&
      this.tags[2] == "level"
    )
      return; // Nur Level-Info? Nicht anzeigen
  }

  if (this.tags.length == 2) {
    if (this.tags[0] == "layer" && this.tags[1] == "level") return; // Nur Level-Info? Nicht anzeigen
    if (this.tags[0] == "description" && this.tags[1] == "level") return; // Nur Level-Info? Nicht anzeigen
  }

  if (this.tags.length == 1) {
    if (this.tags[0] == "level") return; // Nur Level-Info? Nicht anzeigen
    if (this.tags[0] == "layer") return;
    if (this.tags[0] == "source") return;
    if (this.tags[0] == "noexit") return;
    if (this.tags[0] == "created_by") return;
    if (this.tags[0] == "wheelchair") return;
    if (this.tags[0] == "highway" && this.values[0] == "crossing") return;
    if (this.tags[0] == "power" && this.values[0] == "pole") return; // Is shown by the way type power already
    if (this.tags[0] == "fixme" && viewAbstr == 0) return;
  }

  if (viewAbstr == 0) {
    if (this.GetTagStarts("xmas:")) return;
    if (this.GetTagStarts("disused:")) return;
    if (this.GetTagStarts("TMC:cid_")) return;

    if (railway == "switch") return; // Nur Kreuzung ohne Info? Nicht anzeigen???
    if (railway == "crossing") return;
    if (railway == "level_crossing") return;
    if (railway == "railway_crossing") return;

    if (this.GetTag("removed:historic")) return;

    if (amenity == "marketplace") return;

    if (public_transport == "stop_position") return; // ??? Auch "normale" Haltestellen!
  }

  if (this.tags.length > 0) {
    var material = mlm.red;
    var tb = 0.4;

    if (this.tags.length == 1)
      if (this.tags[0] == "addr:housenumber") {
        material = mlm.building;
        tb = 0.8;
      }

    if (
      false ||
      amenity == "pub" ||
      amenity == "cafe" ||
      amenity == "doctors" ||
      amenity == "fast_food" ||
      amenity == "ice_cream" ||
      amenity == "restaurant" ||
      amenity == "car_rental" ||
      amenity == "car_sharing" ||
      amenity == "bicycle_rental" ||
      amenity == "bicycle_repair_station" ||
      this.GetTag("shop")
    ) {
      material = mlm.blue;
      tb = 0.8;
    }
    if (FilterType > 1 && this.filter) material = FilterMaterial;
    //	return new NodeGeo().tet(1.5,this.id).trans(0,1,0).node(material,this)
    return new NodeGeo()
      .cyl(tb, tb, tb * 2, 8)
      .trans(0, 1, 0)
      .node(material, this);
    //                  		t,b,h,s
  }
};

Node.prototype.renderCamping = function (material) {
  var height = this.GetTagDef("height", 0.75) * 1;
  var width = this.GetTagDef("width", height * 1.2) * 1;
  var length_ = this.GetTagDef("length", width * 1.5) * 1;
  var direction = this.GetTagDef("direction", 0) * 1;
  var seatHeight = height / 1.7;

  var col;
  if ((col = this.GetTag("colour"))) material = ColourMaterial(col);

  /* calculate vectors and corners */
  var wood = height / 15;
  var l = length_ / 2.4 - wood;
  var w = width / 2 - wood;
  var poleThickness = wood * 1.6;

  var cornerOffsets = [];
  cornerOffsets.push([+l, +w]);
  cornerOffsets.push([+l, -w]);
  cornerOffsets.push([-l, -w]);
  cornerOffsets.push([-l, +w]);

  var table = new NodeGeo()
    .box(width, wood, length_)
    .trans(0, height - wood / 2, 0);
  var geometry = table.geometry;

  /* draw poles */
  new NodeGeo()
    .box(poleThickness * 1.5, height * 1.1, poleThickness)
    .rotz(+35)
    .trans(+w, height / 2 + 0.001, +l)
    .mergeto(table);
  new NodeGeo()
    .box(poleThickness * 1.5, height * 1.1, poleThickness)
    .rotz(+35)
    .trans(+w, height / 2 + 0.001, -l)
    .mergeto(table);
  new NodeGeo()
    .box(poleThickness * 1.5, height * 1.1, poleThickness)
    .rotz(-35)
    .trans(-w, height / 2 + 0.001, +l)
    .mergeto(table);
  new NodeGeo()
    .box(poleThickness * 1.5, height * 1.1, poleThickness)
    .rotz(-35)
    .trans(-w, height / 2 + 0.001, -l)
    .mergeto(table);

  /* draw seats */
  new NodeGeo()
    .box(width / 3, height / 15, length_)
    .trans(+width * 0.9, seatHeight, 0)
    .mergeto(table);
  new NodeGeo()
    .box(width / 3, height / 15, length_)
    .trans(-width * 0.9, seatHeight, 0)
    .mergeto(table);
  /* draw boals */
  new NodeGeo()
    .box(width * 2.1, poleThickness * 1.1, height / 15)
    .trans(0, seatHeight - poleThickness / 2, +l)
    .mergeto(table);
  new NodeGeo()
    .box(width * 2.1, poleThickness * 1.1, height / 15)
    .trans(0, seatHeight - poleThickness / 2, -l)
    .mergeto(table);

  table.roty(direction).node(material, this, shadow, shadow);
}; // renderCamping

Node.prototype.renderTable = function (material) {
  var seats = this.GetTagDef("seats", 4);
  // All default values are bound to the height value. This allows to chose any table size.
  var height = this.GetTagDef("height", 0.75) * 1;
  var width = this.GetTagDef("width", height * 1.2) * 1; // x
  var length_ = this.GetTagDef("length", (((seats + 1) / 2) * height) / 1.25); //* z */   * 0.5 //TEST !!!!!!!!!!!!!!!!!
  var direction = this.GetTagDef("direction", Math.PI) * 1;
  var seatHeight = height / 1.5;

  /* determine material .. */

  var col;
  if ((col = this.GetTag("colour"))) material = ColourMaterial(col);
  material = [material, material, material, material, material, material]; // Tisch aus Boxen mit 6 Seiten!
  // Man könnte auch beim "object-merge" prüfen, ob das array lang genug ist für die enthaltenen Indexi

  /* calculate vectors and corners */
  var wood = height / 15;
  var l = length_ / 2 - wood;
  var w = width / 2 - wood;
  var poleThickness = wood * 1.6;

  var cornerOffsets = [];
  cornerOffsets.push([+l, +w]);
  cornerOffsets.push([+l, -w]);
  cornerOffsets.push([-l, -w]);
  cornerOffsets.push([-l, +w]);

  var table = new NodeGeo()
    .box(width, height / 15, length_)
    .trans(0, height - wood / 20, 0);
  var geometry = table.geometry;

  /* draw poles */
  for (var p in cornerOffsets) {
    new NodeGeo()
      .box(poleThickness, height, poleThickness)
      .trans(cornerOffsets[p][1], height / 2 + 0.001, cornerOffsets[p][0])
      .mergeto(table);
  }

  /* draw seats */
  var leftSeats = Math.floor(seats / 2);
  var rightSeats = Math.floor((seats + 1) / 2);
  this.renderSeatSide(
    table,
    +width / 2 + seatHeight / 2.5,
    length_,
    leftSeats,
    seatHeight,
  );
  this.renderSeatSide(
    table,
    -width / 2 - seatHeight / 2.5,
    length_,
    rightSeats,
    seatHeight,
  );

  table.roty(direction).node(material, this, shadow, shadow);
}; // renderTable

// Die Stühle sind an der z=length_Seite des Tischs.

// private void renderSeatSide(Target<?> target, Material material, VectorXZ rowPos, float length,  int seats, float seatHeight) {
Node.prototype.renderSeatSide = function (
  table,
  rowPos,
  length_,
  seats,
  seatHeight,
) {
  var seatWidth = seatHeight / 1.25; // z??
  var seatLength = seatHeight / 1.25; // y??
  var seatBase_y = seatHeight * 0.94;

  var backrestBase_z = 0 + rowPos + seatLength * 0.45;
  var backrestBase_y = seatHeight;

  for (var i = 0; i < seats; i++) {
    var seatBoardPos = (length_ / seats) * ((seats - 1) / 2.0 - i);

    var l = seatLength * 0.45;
    var w = seatWidth * 0.45;
    var cornerOffsets = [];
    cornerOffsets.push([+l, +w]);
    cornerOffsets.push([+l, -w]);
    cornerOffsets.push([-l, -w]);
    cornerOffsets.push([-l, +w]);

    var matrix = new THREE.Matrix4();

    /* draw seat */
    var ngSeat = new NodeGeo()
      .box(seatLength, seatHeight * 0.06, seatWidth)
      .trans(0, seatHeight - (seatHeight * 0.06) / 2, 0);
    //r seat = ngSeat.geometry

    /* draw backrest */
    new NodeGeo()
      .box(seatLength / 10, seatHeight, seatWidth)
      .trans(rowPos / 3.5, seatHeight + seatHeight / 2, 0)
      .mergeto(ngSeat);

    /* draw poles */
    for (var p in cornerOffsets) {
      new NodeGeo()
        .box(seatLength / 10, seatHeight, seatWidth / 10)
        .trans(cornerOffsets[p][1], seatHeight / 2 + 0.001, cornerOffsets[p][0])
        .mergeto(ngSeat);
    }

    /* place seat to table */
    ngSeat.trans(rowPos, 0, seatBoardPos).mergeto(table);
  }
};

/****************** Windrad ****/

Node.prototype.renderWindrad = function () {
  // addGLB(this.x, this.z);
  // return;

  try {
    var min_height = this.GetTagDef("min_height", 0) * 1;
    var poleHeight = this.GetTagDef("height", 100) * 1 - min_height;
    var poleRadiusBottom = this.GetTagDef("width", poleHeight / 20) / 2; // changed default from 5 to this
    var poleRadiusTop = poleRadiusBottom / 2;
    var nacelleHeight = poleHeight * 0.05;
    var nacelleDepth = poleHeight * 0.1;
    var bladeLength = this.GetTagDef("rotor:diameter", poleHeight / 2) * 1;
  } catch (err) {
    log("renderSeatSide: unit not processed?");
    return;
  }

  /* determine material ... ?? */

  var nacelle = new NodeGeo()
    .box(nacelleHeight, nacelleHeight, nacelleDepth)
    .trans(0, poleHeight, nacelleDepth / 2 - poleRadiusTop * 2);
  var pole = new NodeGeo()
    .cyl(poleRadiusTop, poleRadiusBottom, poleHeight)
    .trans(0, poleHeight / 2, 0)
    .merge(nacelle)
    .maps(mlm.industrial, this.x, this.z, 0, shadow, shadow);
  pole.position.y = min_height;
  //			material,x,z,y, receive,cast
  /* draw blades */

  // define blade shape (front+back threeangle => Doubelsided-material! )
  var points = [];
  points.unshift(new THREE.Vector2(0, +nacelleHeight / 2));
  points.unshift(new THREE.Vector2(-bladeLength, 0));
  points.unshift(new THREE.Vector2(0, -nacelleHeight / 2));

  var a = Math.random() * 120;
  var blade1 = new NodeGeo()
    .shape(points)
    .rotx(20)
    .rotz(a + 120);
  var blade2 = new NodeGeo()
    .shape(points)
    .rotx(20)
    .rotz(a - 120);
  var blades = new NodeGeo()
    .shape(points)
    .rotx(20)
    .rotz(a)
    .merge(blade1)
    .merge(blade2)
    .trans(0, 0, -poleRadiusTop * 3)
    .maps(mlm.industrial, 0, 0, poleHeight, shadow, shadow);
  pole.add(blades);
  pole.osm = blades.osm = this; //node
  windSpin.push(blades);
  this.mesh = pole;
};
