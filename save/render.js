/////////////////////////////////////////////////////////////////////////////// Extra gibt MAP?TILE aus OSM, Avatar+GPS-Marker  (HUD mit Logo ist an der Kamera)

var map_dae;

var pack;
var tagNames = false;
var tagInfos = false;

var level = 0;
var levelHeight = 3;
var layer = 0;
var layerHeight = 3;
var llPos = 0; // calculated positon

var dtCount = 0;
var partView = 1; // 1:show  0:hide  -1:hide even "building" if tag "building:part" is set. That's waht 2D-Renderer do?

var FilterString = "";
var FilterArray = [];
var FilterMaterial = null;
var FilterCount = 0;

var replayX = 0;
var replayDX = 0;
var replayY = 0;
var replayDY = 0;
var replayZ = 0;
var replayDZ = 0;
var replayD = 0;
var replayDD = 0; // direction NDEW
var replayV = 0;
var replayDV = 0; // view up/down
var replayS = 0;
var replayDS = 0; // Schräglage
var replayG = 0; // Glättung

var ModelDelete = [];
var Houses = [];

var buildingParts = 0;

var colors = [];
var OPAC = 0.9;

var ddapi;
var ddThat;
var ddInfo;

function DDMM2D(x) {
  // Lat/Lon format DDMM.MMM nach D.dezimal
  var d = Math.floor(x / 100); // Grad-Anteil
  var n = (x - d * 100) / 60; // Grad weg, Minunte/60 = Grad-Nachkommastellen
  return d + n;
}

function ResetTiles() {
  nodes = [];
  ways = [];
  rels = [];

  viewTiles = [[]]; // [latZ][lonX]
  loadTiles = [[]]; // [latZ][lonX]

  nodeNeLaI = 0; // Init
  nodeNeLaP = 0; // Place
  nodeFirst = undefined;
  nodeCount = 0;

  waysL = 0;
  wayFirst = undefined;
  wayNeLaI = 0; // Init
  wayNeLaP = 0; // Place
  wayCount = 0;
  wayIndex = -1;

  waysL = 0;
  wayFirst = undefined;
  wayNeLaI = 0; // Init
  wayNeLaP = 0; // Place
  wayCount = 0;
  wayIndex = -1;

  scene.remove(maps);
  maps = map = new THREE.Mesh();
  maps.name = "Root:maps";
  scene.add(maps);

  //colors = []
  //Style()
}

function Style() {
  ddapi = httpx + "osmgo.org//models//api//"; //  httpx+"159.89.12.114/api/"  // "http ://localhost//api//"  //

  this.buildingRoof = this.to(0x694040, undefined, true);
  this.building = this.to(0xe9e0e9, undefined, true); // this.to(0xd9d0c9) //
  this.buildingPlus = this.to(0xcdccc9, undefined, true);
  this.buildingIndoor = this.ds(0x8080ff, 0.7); // transparent
  this.floor = this.ds(0xe9e0e9, 1.0);
  this.floor2 = this.ds(0xf2efe9, 1.0);
  this.plane = this.ds(0xffff00, 1.0);

  this.line = this.ds(0x808080, 0.2);
  this.line.iCol = colors.length;
  colors.push(this.line);
  colors.push(this.line);
  colors.push(this.line);
  this.mLine = new THREE.LineBasicMaterial({ color: 0x808080 }); // lineWidth: does not work :(   ++ No iCol!

  this.rotSS = this.ds(0xff0000); //     2                         3                         4                         5                        6   Seiten vom Würfel
  this.green = this.ds(0x00ff00);
  colors.push(this.green);
  colors.push(this.green);
  colors.push(this.green);
  colors.push(this.green);
  colors.push(this.green);
  this.yellow = this.ds(0xffff00);
  colors.push(this.yellow);
  colors.push(this.yellow);
  colors.push(this.yellow);
  colors.push(this.yellow);
  colors.push(this.yellow);
  this.red = this.ds(0xff0000);
  colors.push(this.red);
  colors.push(this.red);
  colors.push(this.red);
  colors.push(this.red);
  colors.push(this.red);
  this.blue = this.ds(0x0000ff);
  colors.push(this.blue);
  colors.push(this.blue);
  colors.push(this.blue);
  colors.push(this.blue);
  colors.push(this.blue);
  this.grey = this.ds(0x808080);
  colors.push(this.grey);
  colors.push(this.grey);
  colors.push(this.grey);
  colors.push(this.grey);
  colors.push(this.grey);
  this.grey1 = this.ds(0x606060, 1.0);
  this.black = this.ds(0x000000);
  this.black1 = this.ds(0x000000, 1.0);
  this.blackT = this.ds(0x000000, 0.2); // transparent

  this.dgruen = this.ds(0x008000);
  this.hgruen = this.ds(0x80ff80, 1.0);
  this.dblau = this.ds(0x000080);
  this.white = this.ds(0xffffff);
  this.white1 = this.ds(0xffffff, 1.0);
  this.bright = this.ds(0xc0c0c0);
  this.grey_root = this.ds(0x808080);
  this.sky = this.ds(0x00bfff); //	deep sky blue 	#00BFFF 	(0,191,255)
  this.no_osm = this.ds(0xff99ff);

  /**
			this.dunkel      = this.ds(0x404040)
			this.hell        = this.ds(0xc0c0c0)
			this.drot        = this.ds(0x800000)
			this.hrot        = this.ds(0xff8080)
			this.hblau       = this.ds(0x8080ff)
			this.hgelb       = this.ds(0xffFF88)
			this.sienna      = this.ds(0xA0522D)
	**/

  this.raceway = this.ds(0xffc0cb, 1.0);
  this.motorway = this.ds(0xe892a2, 1.0);
  this.trunk = this.ds(0xf9b29c, 1.0);
  this.primary = this.ds(0xfcd6a4, 1.0);
  this.secondary = this.ds(0xf7fabf, 1.0);
  this.footway = this.ds(0xff8080, 1.0);

  // https://github.com/gravitystorm/openstreetmap-carto
  // http ://www.rapidtables.com/web/color/RGB_Color.htm

  this.allotments = this.ds(0xeecfb3);
  this.cemetery = this.ds(0xaacbaf);
  this.orchard = this.ds(0xaedfa3);
  this.commercial = this.ds(0xf2dad9);
  this.construction = this.ds(0xc7c7b4); // also brownfield
  this.farmland = this.ds(0xfbecd7); // Lch(94,12,80) (Also used for farm)
  this.farmyard = this.ds(0xf5dcba);
  this.forest = this.ds(0xadd19e);
  this.grass = this.ds(0xcdebb0);
  this.landfill = this.ds(0xb6b592);
  this.industrial = this.ds(0xebdbe8);
  this.park = this.ds(0xc8facc);
  this.park = this.ds(0xcdebb0); //???
  this.parking = this.ds(0xf7efb7);
  this.garages = this.ds(0xdfddce);
  this.pitch = this.ds(0x80d7b5);
  this.quarry = this.ds(0xc5c3c3);
  this.playground = this.ds(0xddfbc0); // @playground: lighten(@park, 5%);  water_park
  this.residential = this.ds(0xe0dfdf);
  this.retail = this.ds(0xffd6d1);
  this.societal_am = this.ds(0xf0f0d8); // @societal_amenities
  this.school = this.ds(0xf0f0d8); // darken(@societal_amenities=#f0f0d8, 70%)  = e0e0c8 kindergarten,college,university
  this.track = this.ds(0x996600);
  this.land = this.ds(0xf2efe9); // @land-color;
  this.water = this.ds(0xb5d0d0); // @water-color;  [waterway = 'riverbank']::waterway
  this.waterB = this.ds(0xb5d0ff); // Mehr Blau!
  this.mud = this.ds(0x2c6396); // @wetland-text: darken(#4aa5fa, 25%); /* Also for marsh and mud */
  this.bare_ground = this.ds(0xeee5dc); // shingle
  this.heath = this.ds(0xd6d99f);
  this.forest = this.ds(0xadd19e);
  this.sand = this.ds(0xf5e9c6);
  this.scrub = this.ds(0xb5e3b5);
  this.bridge = this.ds(0xb8b8b8);

  this.airport = this.ds(0xe9e7e2); // = aerodrome
  this.apron = this.ds(0xe9d1ff);
  this.aeroway = this.ds(0xb0b0c0); // @aeroway-fill: #bbc;
  this.rest_area = this.ds(0xefc8c8);

  this.pl_o_worship = this.to(0xcdccc9);
  this.steps = this.ds(0xfa8072); // Stufen => footway-fill => salmon => #FA8072

  this.amenity_brown = this.ds(0x734a08); // atm,bank,bar,cafe,tourism_artwork,cinema,nightclub,fire_station,fountain,ice_cream,... default!

  //	if(THREE.REVISION>83)
  this.cTree = [this.amenity_brown, this.green, this.red, this.red]; // cyl needs 3 colors: tube,top,bottom
  //	else
  //	  this.cTree     = new THREE.MultiMaterial( [ this.amenity_brown, this.green, this.red, this.red] ) // cyl needs 3 colors: tube,top,bottom
  this.cTree.iCol = colors.length;
  colors.push(this.amenity_brown);
  colors.push(this.green);

  this.box3 = [
    this.green,
    this.green,
    this.green,
    this.green,
    this.green,
    this.green,
    this.yellow,
    this.yellow,
    this.yellow,
    this.yellow,
    this.yellow,
    this.yellow,
    this.red,
    this.red,
    this.red,
    this.red,
    this.red,
    this.red,
    this.grey,
  ]; //    2            3            4            5            6      one colour per box side!
  this.box3.iCol = colors.length;
  colors.push(this.green);
  colors.push(this.green);
  colors.push(this.green);
  colors.push(this.green);
  colors.push(this.green);
  colors.push(this.green);
  colors.push(this.yellow);
  colors.push(this.yellow);
  colors.push(this.yellow);
  colors.push(this.yellow);
  colors.push(this.yellow);
  colors.push(this.yellow);
  colors.push(this.red);
  colors.push(this.red);
  colors.push(this.red);
  colors.push(this.red);
  colors.push(this.red);
  colors.push(this.red);

  colors.push(this.blue);
  colors.push(this.blue);
  colors.push(this.blue);
  colors.push(this.blue);
}

Style.prototype.ss = function (col) {
  var mat = new THREE.MeshLambertMaterial({ color: col, side: THREE.BackSide }); //?? SideL ??
  mat.iCol = colors.length;
  colors.push(mat);
  return mat;
};

Style.prototype.ds = function (col, opa, black) {
  if (!opa) opa = OPAC;
  if (gCustom == 1) {
    if (black) col = 0;
    else col = 0xffffff;
  }
  var tra = !stereoOn && opa < 1.0;
  var mat = new THREE.MeshLambertMaterial({
    color: col,
    side: THREE.DoubleSide,
    transparent: tra,
    opacity: opa,
  });
  mat.iCol = colors.length;
  colors.push(mat);
  return mat;
};

Style.prototype.to = function (col, opa, black) {
  if (!opa) opa = OPAC;
  if (gCustom == 1) {
    if (black) col = 0;
    else col = 0xffffff;
  }
  var tra = !stereoOn && opa < 1.0 && false;
  var mat = new THREE.MeshLambertMaterial({
    color: col,
    side: THREE.DoubleSide,
    transparent: tra,
    opacity: opa,
  });
  mat.iCol = colors.length;
  mat.name = col;
  colors.push(mat);
  return mat;
};

// MeshLambertMaterial  NICHT reflektierend
// MeshPhongMaterial    Heller - reflektierend

///////////////////////////////////////////

function NodeGeo() {
  this.geometry = undefined;
  return this;
}

NodeGeo.prototype.geo = function (geometry) {
  this.geometry = geometry;
  return this;
};

NodeGeo.prototype.shape = function (points) {
  var shape = new THREE.Shape(points);
  this.geometry = new THREE.ShapeGeometry(shape);
  return this;
};

NodeGeo.prototype.plane = function (b, h) {
  this.geometry = new THREE.PlaneBufferGeometry(b, h, 1, 1);
  return this;
};

NodeGeo.prototype.box = function (w, h, l) {
  this.geometry = new THREE.BoxGeometry(w, h, l); // l <-> h ! ??
  return this;
};

NodeGeo.prototype.cyl = function (t, b, h, s, id) {
  if (!s) s = 16;
  this.geometry = new THREE.CylinderGeometry(t, b, h, s);
  if (id) this.geometry.osmID = id;
  return this;
};

NodeGeo.prototype.sph = function (r, s) {
  if (!s) s = 8;
  this.geometry = new THREE.SphereGeometry(r, s);
  return this;
};

NodeGeo.prototype.tet = function (r, id) {
  this.geometry = new THREE.TetrahedronBufferGeometry(r, 0);
  this.geometry.osmID = id;
  return this;
};

NodeGeo.prototype.trans = function (x, y, z) {
  var m = new THREE.Matrix4().scale(new THREE.Vector3(x, y, z));
  var m = new THREE.Matrix4().makeTranslation(x, y, z); // x,y,z = ost/rechts,hoch/oben,süd/hinten
  this.geometry.applyMatrix(m);
  return this;
};

NodeGeo.prototype.scale = function (x, y, z) {
  if (!y) y = x;
  if (!z) z = x;
  var m = new THREE.Matrix4().scale(new THREE.Vector3(x, y, z));
  this.geometry.applyMatrix(m);
  return this;
};

NodeGeo.prototype.try2 = function (y) {
  // half of the height
  var m = new THREE.Matrix4().makeTranslation(0, y / 2, 0); // x,y,z = ost/rechts,hoch/oben,süd/hinten
  this.geometry.applyMatrix(m);
  return this;
};

NodeGeo.prototype.rotx = function (a) {
  var m = new THREE.Matrix4().makeRotationX(g(a));
  this.geometry.applyMatrix(m);
  return this;
};

NodeGeo.prototype.roty = function (a) {
  var m = new THREE.Matrix4().makeRotationY(g(a)); // positiv ist GEGEN den Uhrzeigersinn (von oben gesehen)
  this.geometry.applyMatrix(m);
  return this;
};

NodeGeo.prototype.rotyr = function (a) {
  var m = new THREE.Matrix4().makeRotationY(a);
  this.geometry.applyMatrix(m);
  return this;
};

NodeGeo.prototype.rotz = function (a) {
  var m = new THREE.Matrix4().makeRotationZ(g(a));
  this.geometry.applyMatrix(m);
  return this;
};

NodeGeo.prototype.merge = function (other, mati) {
  if (!mati) mati = 0;
  this.geometry.merge(other.geometry, undefined, mati);
  return this;
};

NodeGeo.prototype.mergeto = function (to) {
  to.geometry.merge(this.geometry);
  return this;
};

NodeGeo.prototype.maps = function (material, x, z, y, receive, cast) {
  // Only mesh or place on Master-Map by X/Y
  //	if(FilterType>1 && this.filter) material = FilterMaterial ??
  var mesh = new THREE.Mesh(this.geometry, material);
  mesh.position.x = x;
  mesh.position.z = z;
  mesh.position.y = y;
  mesh.receiveShadow = receive;
  mesh.castShadow = cast;
  mesh.name = "NodeGeo";
  if (x || z)
    // position given: show om root-"maps"
    //sh.osm = node
    maps.add(mesh);
  return mesh;
};

NodeGeo.prototype.node = function (material, node, receive, cast) {
  // Place on Map by NODE
  if (cast === undefined) cast = shadow;
  if (receive === undefined) receive = shadow;
  if (FilterType > 1 && node.filter) material = FilterMaterial;
  var mesh = new THREE.Mesh(this.geometry, material);

  mesh.position.x = node.x;
  mesh.position.y = node.GetLLm(0);
  mesh.position.z = node.z;
  mesh.receiveShadow = receive;
  mesh.castShadow = cast;
  mesh.osm = node;
  mesh.name = "NodeGeo:" + node.id;
  addMore(mesh); //map.more.add(mesh)
  node.mesh = mesh;
  return mesh;
};

NodeGeo.prototype.nodes = function (material, node, receive, cast) {
  // Place on Map by NODE
  alert("WEGüüüNodeGeo.prototype.nodes");
  if (cast === undefined) cast = shadow;
  if (receive === undefined) receive = shadow;
  if (FilterType > 1 && node.filter) material = FilterMaterial;
  var mesh = new THREE.Mesh(this.geometry, material);

  mesh.position.x = node.x;
  mesh.position.y = node.GetLLm(0);
  mesh.position.z = node.z;
  mesh.receiveShadow = receive;
  mesh.castShadow = cast;
  mesh.osm = node;
  mesh.name = node.id;
  maps.add(mesh); // Root-map!
  node.mesh = mesh;
  return mesh;
};

///////////////////////////////////////////////////////////////////////////////
////// Klasse: Rel (ation) rrr                                         ////////
///////////////////////////////////////////////////////////////////////////////

var rels = [];
var relNeLa = 0;
var relFirst;

function Rel(id) {
  if (id == 28934) log("www+www:", id, rels[id]);

  if (rels[id]) {
    this.id = 0; // Wird auch als Kennung für "gibt es" genutzt
    return; // Rel war schon da
  }
  this.id = id;

  this.tags = [];
  this.values = [];

  if (relNeLa) relNeLa.next = this;
  relNeLa = this;
  if (!relFirst) relFirst = this;

  this.mmbrs = [];
  this.types = [];
  this.roles = [];

  this.typeMain = undefined;
  rels[id] = this;
  if (dbg >= 4) log("new Rel ", id);
} ////end constructor of Rel

Rel.prototype.AddMember = function (member, type, role) {
  with (this) {
    // log("AddMember",member, type, role)
    if (mmbrs === undefined) {
      log("MIST!rm", this, member);
      return;
    }
    mmbrs.push(member); //??*!
    types.push(type);
    roles.push(role);
  }
};

Rel.prototype.AddTag = function (tag, value) {
  with (this) {
    if (!this.tags) {
      log("tags MIST!rt", id, tag, value, this);
      alert("Rel.prototype.AddTag " + id);
      return;
    }
    tags.push(tag);
    values.push(value);
    //log("Rel:AddTag",tags.length,tag+":"+value)
  }
};

Rel.prototype.GetTag = function (tag) {
  with (this) {
    for (var t in tags) {
      //log(tags[t],tag)
      if (tags[t] == tag) {
        return values[t];
      }
    }
    return false;
  }
};

Rel.prototype.Visible = function (val) {
  with (this) {
    for (m in mmbrs) {
      if (roles[m] != "part") continue;
      var way = ways[mmbrs[m]];
      if (!way) return false;
      if (way.mesh) way.mesh.visible = val;
    }
    return true;
  }
};

Rel.prototype.Type3d_model = function () {
  with (this) {
    if (GET_ParD("mdl", 1) * 1 == 0) return; // no models!
    if (this.model) return; // already done
    this.model = model = GetTag("model");

    var server = GetTag("server");
    var format = GetTag("format");
    if (!format) format = "obj";
    for (m in mmbrs) {
      switch (roles[m]) {
        case "center":
          if (types[m] != "node") return;
          var node = nodes[mmbrs[m]];
          ModelPlace(id, server, model, node.x, node.z, format);
          break;
        case "hide":
          if (types[m] == "node") ModelDelete.push(-mmbrs[m]);
          if (types[m] == "way") ModelDelete.push(+mmbrs[m]);
          if (types[m] == "rel") ModelDelete.push(+mmbrs[m] + 10000000000);
          break;
      }
    }
  }
};

Rel.prototype.TypeLevel = function () {
  with (this) {
    for (m in mmbrs) {
      var mmbr = mmbrs[m];
      var type = types[m];
      switch (roles[m]) {
        case "shell":
          if (type == "way") {
            var rel = rels[mmbr];
            if (rel) rel.Place(true /*hide??*/);
            continue;
          }

          if (type == "relation") {
            var way = ways[mmbr];
            if (way) way.Place();
            continue;
          }

          if (dbg > 2) log("level shell type!=way", id, m, roles[m]);
          continue;

        case "buildingpart":
          continue; // Not handled yet: indoor
      } //role
    } //mmbrs
  }
};

Rel.prototype.TypeShell = function () {
  with (this) {
  }
};

Rel.prototype.TypeMultipolygon = function (hide) {
  with (this) {
    // mmm
    if (!hide) hide = false;

    this.holes = []; // shapes
    this.outer = []; // ways
    this.nodes = []; // wayNodes
    this.parts = 0;

    for (m in mmbrs) {
      if (types[m] != "way") {
        if (dbg > 2) err("Multipolygon mmbr != way! " + id + " " + m);
        return;
      }
      var way = ways[mmbrs[m]];
      if (!way) {
        /*err("Multipolygon with unknown way! "+id+" "+m+" "+mmbrs[m])*/ continue;
      } // no return, just drop the inner
      switch (roles[m]) {
        case "inner":
          var shape = way.Shape();
          if (holes.length < 111)
            if (shape)
              //???
              holes.push(shape); // only closed shapes yet
          break;
        case "outer":
          if (hide) {
            way.typeMain = "R" + id;
            continue;
          } // Don't show
          outer.push(way);
          var node0 = way.wayNodes[0];
          var nodeN = way.wayNodes[way.wayNodes.length - 1];
          if (node0 != nodeN) {
            // outer way part only
            if (dbg == 9)
              log("multipolligone: " + node0 + "-" + nodeN + "-" + nodes[0]);
            var fits = 0;
            if (nodes.length == 0) {
              nodes = way.wayNodes;
              parts = 1;
              continue;
            }
            if (nodes[nodes.length - 1] == node0) {
              nodes = nodes.concat(way.wayNodes);
              fits = 1;
            } // new part-start after  colleted parts
            else if (nodes[nodes.length - 1] == nodeN) {
              nodes = nodes.concat(way.wayNodes.reverse());
              fits = 1;
            } // new part-end   after  colleted parts
            else if (nodeN == nodes[0]) {
              nodes = way.wayNodes.concat(nodes);
              fits = 1;
            } // new part-end   before colleted parts
            else if (node0 == nodes[0]) {
              nodes = way.wayNodes.reverse().concat(nodes);
              fits = 1;
            } // new part-start before colleted parts

            if (fits) parts++;
            else parts = -9990909;
          } else parts = -9990909;
          break;
      } //switch
    } // for

    //if(outer.length >1)   err("Multipolygon with >1 outer!",id)
    if (outer.length == 0) {
      if (dbg > 2) err("Multipolygon with no outer!", id);
      return;
    }

    if (parts > 1) {
      // not bad but not ok !!! ???
      var way = new Way(0);
      var nods = way.wayNodes;
      var wtgs = way.tags;
      var vals = way.values;
      var wid = way.id;

      way.wayNodes = nodes;
      way.tags = tags;
      way.values = values;
      way.typeMain = "multipoligon";
      way.id = "relation/" + this.id;
      if ((type = GetTag("building"))) way.building(type);
      if ((type = GetTag("building:part"))) {
        way.building(type);
        way.typeMain = undefined;
        way.tags = wtgs;
        way.valuess = vals;
        way.nodes = nods;
        way.id = wid;
      }
      if ((type = GetTag("landuse"))) way.landuse(type);
      return;
    }

    for (o in outer) {
      var way = outer[o];
      if (!way) {
        /*err("Multipolygon with outer unknown way! "+id+" "+outer[o])*/ continue;
      }

      if (way.wayNodes[0] != way.wayNodes[way.wayNodes.length - 1]) continue; // no way parts yet ///////////??
      if (holes.length > 0) way.holes = holes; // ??? always? Not all inner are in all outer !!!
      //else log("rel 0 holes! Rel-id"+id)
      if (tags.length > 1) {
        // Tags at relation, not at outer? Move to outer
        if (way.tags.length > 0) {
          /*log("Multipolygon tags also at outer!",  id, outer[o],way.id)*/
        } else {
          way.tags = tags;
          way.values = values;
        }
      }
    }

    if (!way.GetTag("area"))
      // A multip. with an Outer must be an area
      way.AddTag("area", "yes");

    //(GetTag("highway" ))   way.("yes")
    if (GetTag("building")) {
      way.building("yes");
      way.typeMain = "MuPo" + id;
    }
    if (GetTag("building:part")) {
      way.building("yes");
      way.typeMain = undefined;
      way.tags = [];
    }
  }
}; // Multi

Rel.prototype.TypeBuilding = function () {
  with (this) {
    // bbr bbr bbr bbr bbr bbr bbr bbr

    if ((mid = this.GetTag("3dmrX"))) log("edmr-Relation: not coded!!!!!");

    if (partView < 1) return;

    for (m in mmbrs) {
      var role = roles[m];
      if (role == "inner") continue; // ?? todo!
      if (role == "part") continue; // ??
      if (role.substring(0, 3) == "als ") alert("'als ' in" + rel.id); // !!! http ://www.openstreetmap.org/relation/3342625
      if (role != "outer" && role != "outline") {
        // Any other role should be a relatoin

        if (types[m] != "relation") {
          if (dbg > 2) log("building xxx type not rel", id, m, types[m]);
          continue;
        }
        var rel = rels[m];
        if (rel) rel.Place(partView >= 0 /*true/*hide??*/);
        continue;
      }

      /// outer/outline/<noting=building> ///
      var type = types[m];
      switch (type) {
        case "way":
          var way = ways[mmbrs[m]];
          if (!way) {
            if (dbg > 2)
              err(
                "Multipolygon with MISSIG outer way !" +
                  id +
                  " " +
                  m +
                  " " +
                  types[m],
              );
            continue;
          }
          //	way.AddTag("building:part","yes")
          //	way.building(type)
          if (!way.GetTag("building:part")) {
            way.typeMain = "R" + id; // Not a part? hide outer
            if ((mid = way.GetTag("3dmrY"))) {
              log("edmr-Relation-OUTER");

              //// Copy of WAY-Code
              var node;
              var x = (z = 0);
              for (var n in way.wayNodes) {
                // Jede Node ..
                var wayNode = nodes[way.wayNodes[n]];
                if (n == 0) {
                  node = new Node(0, 11, 22);
                  node.tileX = wayNode.tileX;
                  node.tileZ = wayNode.tileZ;
                  node.tags = way.tags;
                  node.values = way.values;
                  continue;
                }
                x += wayNode.x;
                z += wayNode.z;
              }
              x /= way.wayNodes.length - 1;
              z /= way.wayNodes.length - 1;
              node.x = x;
              node.z = z;
              node.typeMain = "3dmr!";
              if (addRepo(node, mid)) return;
              //// Copy of WAY-Code
            }
          }
          break;
        case "relation": // show parts, no outer!
          var relId = mmbrs[m];
          if (!rels[relId]) {
            if (dbg > 2) err("rel member rel missing", id, m, relId);
            break;
          }
          var rel = rels[relId];
          if (rel.type != "multipolygon") {
            if (dbg > 2) log("rel building relation not multipolygon");
            continue;
          }
          rel.Place(partView >= 0); // hide!
          break;
      } //type
    } // for
  }
}; //Building

Rel.prototype.Place = function (hide) {
  with (this) {
    // ppp
    if (!hide) hide = false;
    if (this.typeMain) return;

    if (this.id == dbgWayID || dbg >= 5) {
      log("Debug Relation Place, ID: ", this.id, this);
      dbg = 9;
    } // öör

    llPos = LlPos(this);
    this.typeMain = GetTag("type");
    //log("RELATION Place:",this.typeMain,this.id,this.mmbrs.length)
    switch (this.typeMain) {
      case "3d_model":
        Type3d_model();
        break;
      case "multipolygon":
        TypeMultipolygon(hide);
        break;
      case "building":
        TypeBuilding();
        break;
      //case "level":			TypeLevel()				;break
      //case "shell":			TypeShell()				;break

      //??? complex relatoins of relations! with levels(=indoor=notYet, including "shell"(outer) of level)
      //	The levels are in DIFFERENT buildings - seems to work
      //	if I don't handle indoor yet, the shell should be dropped - and -  ther is no other building in on part

      // rel type building outer: no view if partShow =??
      // Extra rel damit es weg geht? Wie macht Jan das? http ://www.openstreetmap.org/relation/147095#map=19/48.13779/11.57597
    }

    if (this.id == dbgWayID) dbg = 2;
  }
};

// END rrr relation

///////////////////////////////////////////////////////////////////////////////
////// Klasse: Node ///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

//// Contructor: Node //// nn4 nnnn
var nodes = []; // Klassen-Konstante
var nodeNeLaI = 0; // Init
var nodeNeLaP = 0; // Place
var nodeFirst = undefined;
var nodeCount = 0;

function Node(id, lat, lon) {
  if (id == 609) log("node:" + 609817514);

  if (id == 0) {
    id = osmBnode_id;
    osmBnode_id++;
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
  if (!this.GetTag("shop", false)) this.partWay = wayId;
};

Node.prototype.Highway = function (idWay, radius, drawLevel) {
  //log('NodePl::', this.idWay, this.x, this.z, radius, drawLevel)
  //if(this.idWay== 0) { // Node hat noch keinen Way-Zeichner

  if (this.raWay < radius) {
    // Neuer Way ist breiter: neuer Zeichner
    this.idWay = idWay;
    if (this.raWay > 0) map.remove(this.mesh); // If it is a way cycle  alte "Zeichnung" weg
  }
  if (this.idWay != idWay) return null; // Nur der "Zeichner" der Node darf
  if (this.deadEnd && pockemon) return null; // Nur Way-Ende-Node: nicht darstellen

  if (this.GetTag("highway", false) == "turning_circle") {
    radius *= 2;
    this.typeMain = "turning_circle";
  }

  this.raWay = radius;
  var geometry = new THREE.CircleGeometry(radius, 16);
  var m = new THREE.Matrix4().makeTranslation(this.x, this.z, 0);
  geometry.applyMatrix(m);
  return geometry;
}; // End Highway

Node.prototype.GetTag = function (tag, defVal) {
  for (var t in this.tags) if (this.tags[t] == tag) return this.values[t];

  if (defVal) return defVal;
  else return false;
};

Node.prototype.GetTagStarts = function (tag, defVal) {
  for (var t in this.tags)
    if (this.tags[t].indexOf(tag) == 0)
      // found left?
      return this.values[t];

  if (defVal) return defVal;
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

Node.prototype.GetLLm = function (do0) {
  // get hight by level or layer
  var level = this.GetTag("level", false);
  var layer = this.GetTag("layer", false);
  var min_h = this.GetTag("min_height", false);
  var min_b = this.GetTag("building:min_height", false);

  if (min_h) return min_h.replace(",", ".") * 1;
  if (min_b) return min_b.replace(",", ".") * 1;
  if (level) return level.replace(",", ".") * levelHeight; // decimal point! @check: Are decimal commata ok?
  if (layer) return layer.replace(",", ".") * layerHeight;
  if (do0 == 0) return 0;
  return false;
};

Node.prototype.Info = function () {
  with (this) {
    tagNames = tags.slice(); // copy!
    tagInfos = [];

    if (tags.length == 0) return tagInfos.push("- No tags -");

    Tag(typeMain);
    Tag("name");
    Tag("description", 0);
    Tag("area", -1);

    var addr = false;
    for (var t in this.tags)
      if (this.tags[t].indexOf("addr:") == 0) addr = true;
    if (addr) {
      Tag("addr:housename", 0);
      Tag("addr:housenumber", 0);
      Tag("addr:street", 2);
      Tag("addr:place", 2);
      Tag("addr:postcode", 0);
      Tag("addr:city", 2);
      Tag("addr:country", 2);
      Tag("addr:state", 2);
      Tag("addr:suburb", 0);
    }

    while (tagNames.length > 0) Tag(tagNames[0]);
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

function NodeHouse(that) {
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
  var mesh = way.mesh;
  if (!mesh) return;
  mesh.material = mlm.yellow;
}

Node.prototype.Place = function (angle) {
  //   nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn nnn

  if (this.typeMain) return;
  this.typeMain = "+placed+"; // Dont place it again  ää

  if (this.id == dbgWayID) log("node place: ", dbgWayID);

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
  if ((mid = this.GetTag("3dmrZ"))) {
    //  if(gOptimize==0)

    if (addRepo(this, mid)) {
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

  level = this.GetTag("level", 0) * 1;

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
        var dir = this.GetTag("direction", 0) * 1;
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

  if ((place = this.GetTag("place"))) {
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
        var s = (this.GetTag("height", 2.6) * 1) / 2.6; // ergibt Scale-Faktor
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

  if ((cycleway = this.GetTag("cycleway"))) {
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
    var s = 0.4;
    var r = new NodeGeo().box(s, s, s).trans(0, 2.34 + s + s, 0.0);
    var y = new NodeGeo().box(s, s, s).trans(0, 2.32 + s, 0.0);
    return new NodeGeo()
      .box(s, s, s)
      .trans(0, 2.3, 0.0)
      .merge(r, 12)
      .merge(y, 6)
      .node(mlm.box3, this);
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
    var species = this.GetTag("species", "-");
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
      var scale = (this.GetTag("height", 9) * 1) / 9; // ergibt Scale-Faktor
      var top = new NodeGeo().cyl(0.0, 2.0, 8).trans(0, 8 / 2 + 1, 0); // Nadelbaum  9m                  	// cyl needs 3 colors: tube,top,bottom
      return new NodeGeo()
        .cyl(0.2, 0.3, 1)
        .trans(0, 1 / 2, 0)
        .merge(top, 1)
        .scale(scale)
        .node(mlm.cTree, this);
    } else {
      // brown green red
      var scale = (this.GetTag("height", 5) * 1) / 5;
      var top = new NodeGeo().sph(1.5).trans(0, 2 + 1.5 - 0.1, 0); // Laubbaum  4.90m
      return new NodeGeo()
        .cyl(0.2, 0.3, 2)
        .trans(0, 2 / 2, 0)
        .merge(top, 1)
        .scale(scale / 1.3, scale, scale / 1.3)
        .node(mlm.cTree, this); // + level*levelHeight
      // scale().  Ei wenn Specises gegeben?

      /*diameter_crown	width: 2.0; color: green;  */
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
  var height = this.GetTag("height", 0.75) * 1;
  var width = this.GetTag("width", height * 1.2) * 1;
  var length_ = this.GetTag("length", width * 1.5) * 1;
  var direction = this.GetTag("direction", 0) * 1;
  var seatHeight = height / 1.7;

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
  var seats = this.GetTag("seats", 4);
  // All default values are bound to the height value. This allows to chose any table size.
  var height = this.GetTag("height", 0.75) * 1;
  var width = this.GetTag("width", height * 1.2) * 1; // x
  var length_ = this.GetTag("length", (((seats + 1) / 2) * height) / 1.25); //* z */   * 0.5 //TEST !!!!!!!!!!!!!!!!!
  var direction = this.GetTag("direction", Math.PI) * 1;
  var seatHeight = height / 1.5;

  /* determine material .. */

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
  try {
    var min_height = this.GetTag("min_height", 0) * 1;
    var poleHeight = this.GetTag("height", 100) * 1 - min_height;
    var poleRadiusBottom = this.GetTag("width", poleHeight / 20) / 2; // changed default from 5 to this
    var poleRadiusTop = poleRadiusBottom / 2;
    var nacelleHeight = poleHeight * 0.05;
    var nacelleDepth = poleHeight * 0.1;
    var bladeLength = this.GetTag("rotor:diameter", poleHeight / 2) * 1;
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
    .maps(mlm.grey, this.x, this.z, 0, shadow, shadow);
  pole.position.y = min_height;
  //			material,x,z,y, receive,cast
  /* draw blades */

  // define blade shape (front+back threeangle => Doubelsided-material! )
  var points = [];
  points.unshift(new THREE.Vector2(0, +nacelleHeight / 2));
  points.unshift(new THREE.Vector2(-bladeLength, 0));
  points.unshift(new THREE.Vector2(0, -nacelleHeight / 2));

  var a = Math.random() * 120;
  var blade1 = new NodeGeo().shape(points).rotz(a + 120);
  var blade2 = new NodeGeo().shape(points).rotz(a - 120);
  var blades = new NodeGeo()
    .shape(points)
    .rotz(a)
    .merge(blade1)
    .merge(blade2)
    .trans(0, 0, -poleRadiusTop * 3)
    .maps(mlm.grey, 0, 0, poleHeight, shadow, shadow);
  pole.add(blades);
  pole.osm = blades.osm = this; //node
  windSpin.push(blades);
  this.mesh = pole;
};

///////////////////////////////////////////////////////////////////////////////
////// Klasse: Way ////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var ways = [];
var waysL = 0;
var wayFirst = undefined;

var wayNeLaI = 0; // Init
var wayNeLaP = 0; // Place

var wayCount = 0;
var wayIndex = -1;

function Way(id) {
  if (id == 381035) log("wwww Debug: Way ID: ", id);

  if (id == 0) {
    id = osmBnode_id;
    osmBnode_id++;
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
      try {
        var arr = val.split(" "); // if "nnn m" unit is m for meter: drop it
      } catch (err) {
        log("catchhh");
      }
      if (arr.length == 2 && arr[1] == "m") val = arr[0];
      if (val[val.length - 1] == "'")
        // feed?
        val = val.substr(0, val.length - 1) * 0.3048;
      if (val[val.length - 1] == "m" && val[0] >= "0" && val[0] <= "9")
        // @@@  bad direct m?
        val = val.substr(0, val.length - 1) * 1;
      if (noNan && isNaN(val * 1)) {
        val = val.replace(",", ".");
        log("Real-Value with comma in id " + this.id);
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
  if (this.id == 453751858) dbg += 0;
  var last;
  var points = [];
  for (var n in this.wayNodes) { // Jede Node ..
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
  geometry.applyMatrix(matrix);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos + drawLevel;
  if (mesh.position.y >= -0.5) mesh.receiveShadow = shadow;
  mesh.osm = this;

  var m = Math.floor(this.wayNodes.length / 2);
  if (more)
    addMore(mesh, this.wayNodes[m]); // map.add(mesh)
  else addMap(mesh, this.wayNodes[m]);
}; // End Shape

Way.prototype.PowerLine = function (material, posts) {
  // minor_line   location=underground
  if (FilterType > 1 && this.filter) material = FilterMaterial;
  //	var mLine   = new THREE.LineBasicMaterial({color: 0x808080})  // lineWidth: does not work :(
  var geoLine = new THREE.Geometry();

  var geoMast = new THREE.CylinderGeometry(0.2, 0.3, 20, 16); // old: 04,0.6
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
    material = mlm.line;
    hLine = h;
    oLine = 0;
  }

  for (var i in this.wayNodes) { // Jede Node ..
    var node = nodes[this.wayNodes[i]];
    if (node.typeMain) continue;
    node.typeMain = "powerline";

    var a = this.AngleAtNode(this.wayNodes.indexOf(node.id));
    geoLine.vertices.push(new THREE.Vector3(node.x, hLine, node.z));
    var mesh = new THREE.Mesh(geoMast, material);
    mesh.position.y = oLine;
    mesh.position.x += node.x;
    mesh.position.z += node.z;
    mesh.rotation.y = g(a);
    mesh.osm = node;
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    if (posts) addMap(mesh); // map.add( mesh );
  } //WayNodes
  var mesh = new THREE.Line(geoLine, mlm.mLine);
  if (posts) {
    mesh.osm = this;
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
  } else mesh.position.y = -(20 - 2) - 12; // Line from in the air to underground
  var m = Math.floor(this.wayNodes.length / 2);
  addMap(mesh, this.wayNodes[m]); // map.add( mesh )
}; // Power

var colX = [];
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

function ColourMaterial(col, darken, way, black) {
  // ToDo: if _ or - split, if first light or dark modify x%
  if (col.indexOf("0x") == 0)
    // chroma.cs doesn't work with prefix 0x, even as it descripted
    col = col.replace("0x", "#");
  if (colX[col]) col = colX[col];
  col = col.replace("-", " ");
  col = col.replace("_", "");
  try {
    col = chroma(col).darken(darken).hex();
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

dbgWayID = 604097521;

Way.prototype.Building = function (material, matRoof) {
  // Render function /// bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb
  if (this.id == dbgWayID) log("Building:", this.id); // (ggf. dbg-)return

  if (!matRoof) matRoof = material;

  var building = this.GetTag("building");
  var part = this.GetTag("building:part");
  if (part == "no") {
    part = false;
    if (partView > 0) return;
  }
  if (part) {
    buildingParts++ /*err("Way Multipolygon way WITH building:part "+this.id)*/;
    if (partView < 0) return;
  }

  var mesh = undefined;

  var height = defHeight;
  var points = [];
  var last = undefined;
  var partCount = 0;
  var partWay = 0;
  var min_height = 0;
  var roofHeight = 0;
  var roofShape;
  var roofMat = matRoof;
  //log("this",this.wayNodes)

  // if(this.id==304987177) // ööb				log("Debug Building Place, ID: ",this.id,this)

  if (this.wayNodes.length < 4) {
    // Minimum First=Last Node = 2 + 2 more
    err("Building with less than 3 Nodes! Way-ID:" + this.id, this);
    return;
  }

  var partMax = this.wayNodes.length * 0.4; // 50%
  for (var n in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[n]];
    points.push(new THREE.Vector2(node.x, node.z));

    if (last)
      if (node.x == last.x && node.z == last.z)
        err("way ID" + this.id + ": position node " + (n - 1) + "=" + n, this); /// todo: Multi-Rel merge nicht doppel-Node-Refs !!!
    last = node;

    if (n == 0) continue; // first skip, is = last
    if (node.partWay) {
      partCount++;
      if (partWay == 0) partWay = node.partWay;
      else if (partWay != 1 && partWay != node.partWay) partWay = 1; // Zwo different Parts: hide Building is ok
    }

    // if a building node is also a part nodes: don't place the (outer) building. Raw??
    if (
      (partCount > partMax || partCount > 6) &&
      partWay == 1 &&
      !part &&
      partView > 0
    )
      // partCount>10??
      return;
    if (
      node.GetTag("entrance") ||
      node.GetTag("addr:housenumber") ||
      node.GetTag("shop") ||
      node.GetTag("office")
      //|| node.GetTag("amenity")   always ok?? not if "wast_basked"
    ) {
      node.Entrance(this.AngleAtNode(n));
    } //if Tag
  } //wayNodes

  var shape = new THREE.Shape(points);
  var sArea = Math.abs(ShapeUtils.area(points));
  if (typeof this.holes !== "undefined") {
    shape.holes = this.holes;
    /**	for(h in shape.holes) {
				var hShape = shape.holes[h]
				var hPoints = hShape.points.extractPoints() ? https://threejs.org/docs/#api/extras/core/Curve.getPoints
				var hArea = Math.abs( ShapeUtils.area( hPoints ) )
				sArea -= hArea
			} **/
  }
  sArea /= 4;

  if (defHeight != 0) height = defHeight;
  else {
    height = Math.sqrt(sArea /*shape.getLength()*/);
    if (height > 16) {
      // "Grösser" als XXm? langsamm zurück auf 3*h
      height = 2 * 16 - height;
      if (height < 3 * levelHeight) height = 3 * levelHeight;
    }
  }

  // There is always a level 0 = ground floor (first floor in the US?)
  if ((tagLevels = this.GetTag("building:levels") * 1))
    height = tagLevels * levelHeight; // Above ground, mostly positiv           1 *3 = +3m
  if ((tagLevels = this.GetTag("levels") * 1)) height = tagLevels * levelHeight; // not dokumented but used
  if ((tagLevels = this.GetTag("building:max_level") * 1))
    height = (tagLevels + 1) * levelHeight; // Example: only ground floor =>  0 => (0+1)*3 = +3m height
  if ((tagLevelm = this.GetTag("building:min_level") * 1))
    min_height = tagLevelm * levelHeight; // may be negativ  one cellar => -1 =>   -1 *3 = -3m dept
  if ((tagLevelm = this.GetTag("min_level") * 1))
    min_height = tagLevelm * levelHeight; // may be negativ  one cellar => -1 =>   -1 *3 = -3m dept

  if ((tagHeight = this.GetTag("height") * 1)) height = tagHeight * 1; // absolut values overrool level couts
  if ((tagHeight = this.GetTag("building:height") * 1)) height = tagHeight * 1;
  if ((tagHeight = this.GetTag("min_height", false, true) * 1))
    min_height = tagHeight * 1;
  if ((tagHeight = this.GetTag("building:min_height", false, true) * 1))
    min_height = tagHeight * 1;

  if (height < min_height) height += min_height; // Not correct but understandable

  if (llPos < 0 || this.GetTag("indoor")) {
    height = levelHeight * 0.8;
    material = roofMat = mlm.buildingIndoor;
  }

  if ((level = this.GetTag("level")) && !this.GetTag("min_height")) {
    // The Building is "Flying in the air" hopefully on an area with the same level if there is no minimum level
    min_height += level * 1 * levelHeight;
    height += level * 1 * levelHeight;
  }
  if (llPos < 0 && !this.GetTag("min_height")) {
    min_height += llPos;
    height += llPos;
  }

  if (this.GetTag(this.typeMain) == "roof") {
    height = levelHeight; // A roof is usually NOT liftet up if it is large but always first/0 level
    min_height = height - levelHeight * 0.2;
  }

  if (
    height <= 4 * levelHeight &&
    sArea < 400 &&
    !part &&
    roofMat == mlm.building
  )
    roofMat = mlm.buildingRoof;

  if ((col = this.GetTag("building:colour"))) {
    material /*= roofMat*/ = ColourMaterial(col, 1, this, true);
  }

  if ((col = this.GetTag("roof:colour"))) {
    roofMat = ColourMaterial(col, 2, this, true);
  }

  if (FilterType > 1 && this.filter) {
    material = FilterMaterial;
    roofMat = FilterMaterial;
  }

  //r shape    = new THREE.Shape( points )
  var mat0X = [roofMat, material, mlm.red];
  var mat01 = mat0X; //;if(THREE.REVISION<=83)
  //  mat01    = new THREE.MultiMaterial(mat0X)

  var roofMesh = PlaceRoof(this, height, points, mat0X, min_height); /// R#ooof
  if (roofMesh) {
    //??roofMat    = material
    roofHeight = roofMesh.roofHeight;
  } else roofHeight = 0;

  var y = height - roofHeight; // - DrawDelta*5
  var m = new THREE.Matrix4();
  var geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - roofHeight - min_height,
    bevelEnabled: false,
  });
  geometry.applyMatrix(m.makeRotationX(g(90))); //    mesh.rotation.x = g(90)
  geometry.applyMatrix(m.makeTranslation(0, y, 0)); //    mesh.position.y = (height-roofHeight-min_height)+min_height - DrawDelta*5

  var n = Math.floor(this.wayNodes.length / 2);
  var no = nodes[this.wayNodes[n]];
  var dx = Math.abs(no.x - posX0);
  var dz = Math.abs(no.z - posZ0);
  var dd = Phytagoras(dx, dz);
  var d0 = dd < 200;
  if (d0) no = 1;

  if (gOptimize == 0 || d0) {
    //	var
    mesh = new THREE.Mesh(geometry, mat01);
    mesh.castShadow = mesh.receiveShadow = shadow;
    mesh.name = "WB" + this.id;
    mesh.osm = this;
    if (roofMesh) mesh.add(roofMesh);
    //if(part && !building)  // only a part: to more-map: show only if close
    add2Tile(mesh, this.wayNodes[0]);
    this.mesh = mesh; // To hide building if a model replaces it
  } else {
    var iCol = 0;
    if (roofMat.iCol != 0 || material.iCol != 1) {
      // ToDo: schon da? Wiederverwenden
      iCol = colors.length;
      colors.push(roofMat);
      colors.push(material);
    }
    geometry.osm = this;
    add2TileG(geometry, iCol, this.wayNodes[0]);
    if (roofMesh) {
      // mesh.add(roofMesh)
      var geo = roofMesh.geometry.translate(
        roofMesh.position.x,
        roofMesh.position.y,
        roofMesh.position.z,
      );
      add2TileG(geo, iCol, this.wayNodes[0]); // Gleiches Farb-Paar wie beim Haus!
    }
  }
}; // Ende Building

Way.prototype.Fence = function (material, h) {
  if (!h) h = 1.4;
  var geometry = new THREE.Geometry();
  for (var n in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[n]];
    var x = node.x;
    var z = node.z;
    var mh = this.GetTag("min_height", 0) * 1;
    var h = this.GetTag("height", h) * 1 - mh;
    var t = this.GetTag("fence_type"); // todo
    if (t == "railing") material = mlm.grey;
    if (t == "concrete") material = mlm.white;
    if (t == "wood") material = mlm.amenity_brown;

    geometry.vertices.push(
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x, h, z),
    );
  }
  for (var n = 0; n < this.wayNodes.length - 1; n++) {
    var o = n * 2;
    geometry.faces.push(new THREE.Face3(0 + o, 1 + o, 2 + o));
    geometry.faces.push(new THREE.Face3(1 + o, 2 + o, 3 + o));
  }
  geometry.computeFaceNormals();

  if (FilterType > 1 && this.filter) material = FilterMaterial;

  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos + mh;
  mesh.osm = this;
  if (mesh.position.y >= +1.0) mesh.castShadow = shadow;
  if (mesh.position.y >= +1.0) mesh.receiveShadow = shadow;
  addMore(mesh, this.wayNodes[0]); // map.add(mesh)
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
  addMap(mesh, this.wayNodes[m]); // no shadow
}; // Ende Tube

Way.prototype.WaySC = function (
  material,
  radius,
  drawLevel,
  border,
  nodesType,
) {
  // Single-Color   ddd
  var geometry = new THREE.Geometry();
  var preNode;
  for (var n in this.wayNodes) { // Jede Node ..
    var node = nodes[this.wayNodes[n]]; //log('Way *** ' ,n,wayNodes.length-1)

    if (nodesType) {
      node.AddTag("natural", nodesType);
      node.Place();
    }

    // todo: gate NOT as way node but near: Fixit/checker  331873342
    if (node.idWay == 0 || node.idWay == this.id) {
      // this.id drawing way?
      node.idWay = this.id;

      if ((waterway = node.GetTag("waterway"))) {
        node.typeMain = "!";
        var a = this.AngleAtNode(n);
        if (waterway == "weir")
          new NodeGeo()
            .box(radius * 2, 0.4, 1)
            .roty(a)
            .node(mlm.grey, node);
      }

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
    if (gNode != null) geometry.merge(gNode);
    if (n > 0) {
      var gRect = this.RectangleGeometry(
        preNode.x,
        preNode.z,
        node.x,
        node.z,
        radius,
        drawLevel,
      );
      if (gRect) geometry.merge(gRect);
    }
    preNode = node;
  }
  if (FilterType > 1 && this.filter) material = FilterMaterial;
  var matrix = new THREE.Matrix4();
  matrix.makeRotationX(g(90));
  geometry.applyMatrix(matrix);
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos + drawLevel;
  mesh.osm = this;
  if (border) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  } else {
    if (mesh.position.y >= +1.0) mesh.castShadow = shadow;
    if (mesh.position.y >= -0.0) mesh.receiveShadow = shadow;
  }

  // if(border) ma2.add(mesh)
  // else		  map.add(mesh)
  if (border) addMore(mesh, this.wayNodes[0]);
  else addMap(mesh, this.wayNodes[0]);
}; // Ende WaySC

Way.prototype.GetLL = function (do0) {
  // get hight by level or layer
  var level = this.GetTag("level", false);
  var layer = this.GetTag("layer", false);
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

  var geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3(x0 + sc[1], level0 + DrawDelta * 6, z0 - sc[0]),
  );
  geometry.vertices.push(
    new THREE.Vector3(x0 - sc[1], level0 + DrawDelta * 6, z0 + sc[0]),
  );
  geometry.vertices.push(
    new THREE.Vector3(x2 - sc[1], level1 + DrawDelta * 6, z2 + sc[0]),
  );
  geometry.vertices.push(
    new THREE.Vector3(x2 + sc[1], level1 + DrawDelta * 6, z2 - sc[0]),
  );
  geometry.faces.push(new THREE.Face3(0, 1, 2));
  geometry.faces.push(new THREE.Face3(0, 2, 3));

  assignUVs(geometry);

  if (FilterType > 1 && this.filter) material = FilterMaterial;
  else material = mlm.steps;

  var mesh = new THREE.Mesh(geometry, material);
  mesh.osm = this;
  if (mesh.position.y >= +1.0) mesh.castShadow = shadow;
  if (mesh.position.y >= +1.0) mesh.receiveShadow = shadow;
  addMap(mesh, this.wayNodes[0]);
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
  for (var n in this.wayNodes) { // Jede Node ..
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
  with (this) {
    tagNames = tags.slice(); // copy!
    tagInfos = [];

    if (tags.length == 0) return tagInfos.push("- No tags -");

    Tag(typeMain);
    Tag("name");
    Tag("description", 0);
    Tag("area", -1);

    var addr = false;
    for (var t in this.tags)
      if (this.tags[t].indexOf("addr:") == 0) addr = true;
    if (addr) {
      Tag("addr:housenumber", 0);
      Tag("addr:housename", 0);
      Tag("addr:street", 2);
      Tag("addr:place", 2);
      Tag("addr:postcode", 0);
      Tag("addr:city", 2);
      Tag("addr:country", 2);
      Tag("addr:state", 2);
      Tag("addr:suburb", 0);
    }

    while (tagNames.length > 0) Tag(tagNames[0]);
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
    case "wetland":
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
  //  WaySC(material,radius,drawLevel,border,trees) { // Single-Color
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
    case "meadow":
    case "garden":
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
      if (!this.GetTag("height")) this.AddTag("height", "15");
      this.Building(mlm.grey);
      break;
    case "tower":
      if (!this.GetTag("height")) this.AddTag("height", "22");
      this.Building(mlm.building);
      break;
    case "water_tower":
      if (!this.GetTag("height")) this.AddTag("height", "25");
      this.Building(mlm.building);
      break;
    case "chimney":
      if (!this.GetTag("height")) this.AddTag("height", "60");
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
  h = levelHeight;
  var geometry = new THREE.Geometry();
  for (var n in this.wayNodes) {
    // Jede Node ..
    var node = nodes[this.wayNodes[n]];
    var x = node.x;
    var z = node.z;
    material = mlm.building;

    geometry.vertices.push(
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x, h, z),
    );
  }
  for (var n = 0; n < this.wayNodes.length - 1; n++) {
    var o = n * 2;
    geometry.faces.push(new THREE.Face3(0 + o, 1 + o, 2 + o));
    geometry.faces.push(new THREE.Face3(1 + o, 2 + o, 3 + o));
  }
  geometry.computeFaceNormals();

  if (FilterType > 1 && this.filter) material = FilterMaterial;

  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = llPos;
  mesh.osm = this;
  addMore(mesh, this.wayNodes[0]); // map.add(mesh)
}; // addr:interpolation

Way.prototype.barrier = function (type) {
  switch (type) {
    case "retaining_wall":
      WayOrShape(this, mlm.land, 0, 0.75, "cliff");
      return;
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
      this.Fence(mlm.white);
      break;

    case "hedge":
      if (this.GetTag("area")) {
        if (!this.GetTag("height")) this.AddTag("height", "1");
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

function LlPos(obj) {
  level = obj.GetTag("level", 0) * 1;
  layer = obj.GetTag("layer", 0) * 1;

  if (Math.abs(layer * layerHeight) > Math.abs(level * levelHeight))
    ll = layer * layerHeight;
  else ll = level * levelHeight;

  return ll;
}

Way.prototype.DoTag = function (tagIsMethodName) {
  with (this) {
    // Bei callback auf Klassen-Methoden muss die Instanz UND die Methode übergebenwerden. Da es hier aber das gleiche "this" ist, doch nicht :-)
    // Suche in den Tags, ob der gewünchte dabei ist. Wenn ja:
    // Rufe die Callback-Funktion/Methode der Instanz auf (wobei hier Tag-Name = Methoden-Name ist)
    // und übergebe dabei den Tag-Value = Unter-Typ
    //log("tagIsMethodName",tagIsMethodName)

    var tag = tagIsMethodName;
    if (tag == "interpolation") tag = "addr:interpolation";

    if (typeMain) return; // Wichtigerer Main-Tag wurde schon gefunden
    if ((subType = GetTag(tag))) {
      llPos = LlPos(this);

      typeMain = tagIsMethodName;
      this[tagIsMethodName](subType); // Hier muss das  this am Anfang bleiben!
      llPos = 0;
    }
  }
};

// https://3dwarehouse.sketchup.com/model.html?id=eba1abcbc233133e167e69c6aa163b36
function ModelPlace(id, server, model, x, z, format) {
  // server: ToDo
  if (dbg > 1) log("***** ModelPlace: ", server, model, x, z, format);
  if (simul) simul = true; //  return

  if (FilterType > 1 && this.filter) return;

  var onError = function (xhr) {
    log("onError", xhr);
  };

  var onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      var percentComplete = (xhr.loaded / xhr.total) * 100;
      if (dbg > 1.6) log(Math.round(percentComplete, 2) + "% downloaded");
    }
  };

  var onLoadedMTL = function (object) {
    if (dbg > 2) log("onLoadedMTL:", object.children);
    for (c in object.children) {
      var mesh = object.children[c];
      mesh.castShadow = shadow;
      mesh.receiveShadow = shadow;
      if (id == 4711 || id == 4717 || id == -1)
        mesh.geometry.computeVertexNormals(); // Farbuebergaenge weich, weil das beim Modell von Alex fehlt
    } //children

    if (id == -1) {
      var s = 0.6; // 0.015  // mm zu m und größer zum sehen
      object.scale.set(s, s, s);
      object.rotation.y = g(180);
      object.position.z = -1.954;
      mesh2Segway = object;
      mesh2Segway.visible = control.controlMode == 2;
    } else objectLast = object;

    if (id == 4903) {
      // gCustom==3
      object.rotation.y = g(203);
      object.position.x += 17;
      object.position.y += 0.2;
      object.position.z += 38;
    }

    var s = 1 / 32;
    if (id == 4798) object.scale.set(s, s, s);
    if (id == 4798) object.rotation.y = g(45);
    if (id == 4798) object.position.x = 2000;
    if (id == 4798) object.position.z = 20000;
    //			object.matrixWorldNeedsUpdate = true
    if (id == 4711) object.rotation.y = g(-101);
    if (id == 4712) object.rotation.y = g(-99); //  Not needed but: Did not work?   London Eye
    if (id == 4713) object.scale.set(0.02, 0.02, 0.02);
    if (id == 4713) object.position.y = 0.4;
    if (id == 4713) object.rotation.y = g(-45 + 90);
    if (id == 4716) object.scale.set(1, 1, 1);
    if (id == 4716) object.rotation.y = g(45);
    var s = (2 * 100) / 4;
    if (id == 4717) object.scale.set(s, s, s);
    if (id == 4717) object.position.y = s * 0.84;
    var s = (2 * 50) / 4;
    if (id == 4718) object.scale.set(s, s, s);
    if (id == 4718) object.position.y = s * 0.84;

    if (id == 4719) object.scale.set(0.001, 0.001, 0.001);
    if (id == 4719) object.rotation.x += g(-90);

    object.position.x += x;
    object.position.z += z;
    object.castShadow = shadow;
    object.receiveShadow = shadow;
    maps.add(object);
  };

  THREE.Loader.Handlers.add(/\.dds$/i, new THREE.DDSLoader()); // nur für OBJ ???

  if (format == "obj") {
    // && parMdl>0
    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath("models/");
    mtlLoader.load(model + ".mtl", function (materials) {
      materials.preload();
      var objLoader = new THREE.OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath("models/");
      //log( "model:",model );
      objLoader.load(
        model + ".obj", // Filename
        onLoadedMTL,
        onProgress,
        onError,
      ); //objLoader
    }); //mtlLoader
  } //formatOBJ

  if (format == "dae" && parMdl > 0) {
    //
    map_dae = maps;
    var loader = new THREE.ColladaLoader();
    loader.load(
      "models/" + model + ".dae", // resource URL
      function (collada) {
        var chil = collada.scene.children[0].children;
        var mesh = chil[0];
        if (chil.length > 1) mesh = chil[1];
        mesh.rotation.x = g(-90);
        mesh.rotation.z = g(+90);
        mesh.position.x = x;
        mesh.position.z = z;
        if (id == 4719) {
          mesh.rotation.z += g(-90);
          mesh.position.z += 0;
          mesh.position.x += 14;
          mesh.scale.set(0.02, 0.02, 0.02);
        }
        if (id == 4714) {
          mesh.position.x += 60;
          mesh.position.y = -1.954;
          mesh.position.z += 45;
          mesh.scale.x = 0.1;
          mesh.scale.y = 0.1;
          mesh.scale.z = 0.1;
        }
        if (id == 4715) {
          mesh.position.z += 9;
          mesh.position.x += 0;
          mesh.scale.x = 0.025;
          mesh.scale.y = 0.025;
          mesh.scale.z = 0.025;
        }
        ///	 mesh.computeVertexNormals(); // ist kein mesh!
        mesh.castShadow = shadow;
        map_dae.add(mesh);
      }, // Function when resource is loaded
      onProgress,
    );
  }
} //ModelPlace

Way.prototype.Place = function () {
  with (this) {
    if (typeMain) return; // way already placed
    if (id == dbgWayID)
      // || dbg>=5) // wwww
      log("Debug Way Place, ID: ", id, this);
    if (tags.length < 1) {
      //if(dbg>6) err("Way without tags, ID: ",id)
      return;
      // AddTag("highway","without_tags") // Ersatzdarstellung als higheway
    }

    var mid;
    if ((mid = this.GetTag("3dmrA"))) {
      //ööö
      //this.typeMain = "3dmr"   /// geetestet?
      //var node = nodes[this.wayNodes[0]]

      //// Copy in NODE-Code
      var node;
      var x = (z = 0);
      for (var n in this.wayNodes) {
        // Jede Node ..
        var wayNode = nodes[wayNodes[n]];
        if (n == 0) {
          node = new Node(0, 11, 22);
          node.tileX = wayNode.tileX;
          node.tileZ = wayNode.tileZ;
          node.tags = tags;
          node.values = values;
          continue;
        }
        x += wayNode.x;
        z += wayNode.z;
      }
      x /= wayNodes.length - 1;
      z /= wayNodes.length - 1;
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
    DoTag("building"); // Wenn Building, ist Power nur Hilfsinfo. Und was ist mit Weg/Fläche?
    if ((type = GetTag("building:part")) && !typeMain && partView > 0) {
      llPos = LlPos(this);
      building(type);
      typeMain = "building:part";
    }
    DoTag("room");
    DoTag("power");
    DoTag("memorial");
    /** 217144127 wird nicht sichbar, 562713285 doppelt! * /
			if( (GetTag("area:highway")) ) {
				WayTag("area:highway")
				if(!GetTag("area"))
					AddTag("area","yes")
			} /**/

    // Boden                  -8,9 oder 11?
    DoTag("landuse"); // -5 -6 -7    landuse VOR und unter leisure, falls beides getaggt ist, da es dann (auch) was größeres ist was tiefer muss
    DoTag("amenity"); // -3 -4
    DoTag("leisure"); // -1 -2      ddd DrawDelta
    DoTag("natural"); // -1 -2 -2?  NEW
    DoTag("waterway"); //  0-Ebene
    DoTag("highway"); // +3+4
    DoTag("railway"); // +1+2
    DoTag("aeroway"); // -5 areas / +4 wege
    DoTag("barrier"); //  %  nach higway, da es auch Wege-Hindernisse gibt: Treppen
    DoTag("boundary"); //  %
    DoTag("interpolation");
    DoTag("man_made");
    DoTag("_keep"); // ---

    if ((!typeMain && dbg > 5) || dbg > 8)
      log("PLACE ", typeMain, id, tags, values);
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
    for (var n in this.wayNodes) { // Jede Node ..
      var node = nodes[this.wayNodes[n]];
      if (node) node.AnalysePart(this.id);
    }
  }
}; // Analyse  ------------------------------------

// Ende Way Klasse //////////

///////////////////////////////////////////////////////////////////////////////
////// Klasse: Ding/Map-Renderer //////////////////////////////////////////////
////// Es gibt MAP / Avatar+GPS-Marker=?
///////////////////////////////////////////////////////////////////////////////

function Ding() {
  // Konstruktor
  lon = 0;
  lat = 0;

  partView = GET_ParD("bp", "1") * 1;
  this.subView = GET_ParD("sub", 0);
  FilterString = GET_ParD("f", "");
  FilterMaterial = new THREE.MeshLambertMaterial({
    color: 0x808080,
    transparent: false,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  if (FilterString != "") {
    // Da ist was zum Filtern
    FilterType = 2; // Transparent
    if (FilterString.substr(0, 1) == "!") {
      FilterType = 1; // Marker
      FilterString = FilterString.substr(1);
    }
    if (FilterString.substr(0, 1) == "+") {
      FilterType = 3; // Shape
      FilterString = FilterString.substr(1);
      FilterMaterial = new THREE.MeshBasicMaterial({
        color: 0x808080,
        wireframe: true,
        wireframeLinewidth: 1,
      });
    }
  }

  if (FilterType == 2) shadow = false;

  pockemon = true; //if(params != "") pockemon = false

  // Globale Variablen sind noch mehr Pfui als Konstatnen //////////////////////////

  osmBuilder = new OsmBuilder(); // JSON.js  noch

  maps = map = new THREE.Mesh();
  maps.name = "Root:maps";
  scene.add(maps); // Map ist in Metern (nicht GPS-Grad) Nullpunkt ist was? NICHT Greenwitch oder Equator, immer noch Lade-Relativ, aber irgendwann mit Nachladen!
}

function AvatarsDo(xchg) {
  //                                  0:ID  1:date_time    2:on 3:lat=x 4:lon=-z 5:ele=y 6:ay 7:ax? 8:v   9:secs 10:usrname?
  // pos|1;2017-03-26 09:04:53;1;1.000;2.000;3.000;4.0;5.0;6.000;0|2;2017-03-26 09:01:58;1;49.7150;11.08700;10.0000;0.00;-10.0;0.000;175|
  var list = xchg.split("|");
  list.shift();
  for (u in list) {
    var vals = list[u].split(";");
    //	if( vals.length < 10 ) continue
    var id = vals[0] * 1;
    if (id == 0) {
      // chat
      if (vals[2] == "1") {
        var chatNew = vals[3];
        if (chatLast != chatNew) {
          chatLast = chatNew;

          if (chatNew.length > 60) {
            var split = chatNew.indexOf(" ", 60 - 5);
            if (split > 0) {
              var tex1 = chatNew.substring(0, split);
              chatNew = chatNew.substring(split);
              chat3 = chat2;
              chat2 = chat1;
              chat1 = chat0;
              chat0 = tex1;
            }
          }

          chat3 = chat2;
          chat2 = chat1;
          chat1 = chat0;
          chat0 = chatNew;
          if (hud) if (hud.Out) hud.Out([chat3, chat2, chat1, chat0]);
        } //new Text
      } //aktiv"1"
      continue;
    } //id=0

    if (!avatars[id]) {
      // create new avatar
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32), cEye);
      mesh.castShadow = shadow;
      mesh.rotation._order = "YXZ";

      var node = new Node(0, 0, 0);
      node.AddTag("User name", vals[10]);
      mesh.osm = node;

      var geoLine = new THREE.Geometry();
      geoLine.vertices.push(new THREE.Vector3(0, 0, 0));
      geoLine.vertices.push(new THREE.Vector3(0, 1000, 0));
      var maLine = new THREE.LineBasicMaterial({ color: 0xffff00 });
      var mLine = new THREE.Line(geoLine, maLine);
      mLine.rotation._order = "YXZ";
      mesh.add(mLine);

      avatars[id] = mesh;
      scene.add(mesh);
    }
    var a = avatars[id];
    if (id == userID) {
      a.visible = false;
      continue;
    }
    a.position.x = GetLon2x(vals[4] * 1, vals[3] * 1);
    a.position.z = GetLat2z(vals[3] * 1); // -z
    a.position.y = vals[5] * 1; // m
    a.rotation.z = g(vals[7] * 1);
    a.rotation.y = g(vals[6] * 1 + 90); // grad=>rad
    a.children[0].rotation.z = -g(vals[7] * 1); // Beam must not look down

    var on = vals[2] == "1";
    a.visible = on;

    var dis =
      a.position.x - camera.position.x + (a.position.z - camera.position.z);
    a.children[0].visible = Math.abs(dis) > 250;
  }
}

function ReplayUpdate(dt) {
  //// AS times gos by ////
  if (gAviation)
    var d = dt * 1; //
  else var d = dt * 5; // GO-Log-Takt
  if (keyShift) {
    d *= 7; // zeitraffer
    if (keyAlt) d *= 7; // stärker
  } else if (keyAlt) d = 0; // Stop
  if (d > 1) d = 1; // max 1 Sekunde
  replayI += d;

  //// frame cycle ////
  if (replayLast != Math.floor(replayI)) {
    var line = replay[Math.floor(replayI)];
    var ii = Math.floor(replayI);
    var line = replay[ii];
    if (!line) {
      replayI = replayLast = -2;
      alert("replay END (index)");
      return;
    }
    if (line.length < 22) {
      replayI = replayLast = -2;
      alert("replay END (line)");
      return;
    }

    if (!gAviation) {
      //// OSMGO

      var l = line.split(";");
      //                   0 1         2         3      4   5     6     7        8      9    10
      // 2017-06-03 17:57:11;1;48.196042;11.810881;101.00;0.000;-10.0;0.000;46979831;myname;loging
      var X = GetLon2x(l[3], l[2]);
      var Z = GetLat2z(l[2]);
      var Y = l[4] * 1;
      var V = l[6] * 1;
      var D = -l[5] * 1;
      var S = 0;
      hud.Out([l[10], replay.length.toString(), Math.floor(replayI)]);
    } //GO
    else {
      //// AVIATION
      var l = line.split(",");
      while (l[0] == "GPGSA" || l[0] == "GPGSV") {
        replayI += 1;
        line = replay[Math.floor(replayI)];
        l = line.split(",");
      }

      replayI += 1; // Ramm-recording ist: Ein Satz pro Sekunde
      var lin2 = replay[Math.floor(replayI)]; // Eigendlich ist das die erste Zeile!
      if (!lin2) {
        replayI = -2;
        alert("replay END (lin2)");
        return;
      }

      var m = lin2.split(",");
      // 0      1          2 3        !4 5         !6 7    8!!   9      10  11 12
      // $GPRMC,HHMMSS.uuu,A,BBBB.BBBB,b,LLLLL.LLLL,l,GG.G,RR.R ,DDMMYY,M.M,m,F*PP
      // $GPRMC,082832.000,A,4934.9869,N,01052.9761,E,0.00,12.78,010618,   , ,D*51

      // $GPGGA,082833.000,4934.9869  ,N,01052.9761,E,   2,    9,  0.85,326.7,M,47.9,M,0000,0000*58
      // $GPGGA,HHMMSS.ss ,BBBB.BBBB  ,b,LLLLL.LLLL,l,   Q,   NN,   D.D,H.H,h,G.G,g,A.A,RRRR*PP
      // 0      1          2           3 4          5    6     7      8 9!  10 1112 113 14
      var la = DDMM2D(l[3] * 1);
      if (l[4] == "S") la *= -1;
      var lo = DDMM2D(l[5] * 1);
      if (l[6] == "W") lo *= -1;
      var h = m[9] * 1 - 325;
      if (h < 1.5) h = 1.5;

      var X = GetLon2x(lo, la);
      var Z = GetLat2z(la);

      var Y = h; // ToDo: Höhe Flughaven beim GO merken
      var minus = h / 20;
      if (minus > 30) minus = 30;
      replayG = (replayG * 9 + replayDY) / 10; // Glättung
      var V = replayG * 8 - minus; // v vorwärz-startgeschwindigkeit*faktor - also nach unten, etwas

      //			var U = l[7]-100//; if(U<0) U=0
      //			var V = U //-15   // v vorwärz-startgeschwindigkeit*faktor - also nach unten, etwas

      var S = replayDD * 2; // je mehr Kurvenflug desto schräger
      var D = l[8] * 1; // Direction

      if (Y < 6.0) {
        S = 0; // Am Boden keine Schräglage
        V = -15;
      }

      hud.Out([
        "Log:" + (replay.length - Math.floor(replayI)) + " - " + nodeCount,
        "Tim:" +
          l[1].substring(0, 2) +
          ":" +
          l[1].substring(2, 4) +
          ":" +
          l[1].substring(4, 6),
        "Pos:" + la.toFixed(6) + "/" + lo.toFixed(6),
        "Ele:" +
          (m[9] * 1).toFixed(1) +
          "(" +
          h.toFixed(1) +
          ")m  -  V:" +
          l[7] * 1 +
          "m/s",
        //	,l[7] +"  #  "+ U +"  #  "+ V
        //	,"D: "+D +"  *  "+ replayDD+"  #  " + S
      ]);
    } //AVI

    // Eckpunkte für Inerpolation merken
    replayDX = X - replayX;
    replayX = X;
    replayDZ = Z - replayZ;
    replayZ = Z;
    replayDY = Y - replayY;
    replayY = Y;
    replayDV = V - replayV;
    replayV = V;
    replayDS = S - replayS;
    replayS = S;
    replayDD = D - replayD;
    replayD = D;
    if (replayDD > +180) replayDD -= 360; // Wenn es mehr als 180 Grad sind
    if (replayDD < -180) replayDD += 360; // dreht es sich bestimmt in die andere Richtung weniger
  } //frame-cycle

  // Next second value minus delta interpoliert
  var rdt = 1 - (replayI - Math.floor(replayI)); // Rmaining time to the next full secound
  camera.position.x = replayX - replayDX * rdt;
  camera.position.z = replayZ - replayDZ * rdt;
  camera.position.y = replayY - replayDY * rdt;
  camera.rotation.x = g(replayV - replayDV * rdt);
  camera.rotation.z = -g(replayS - replayDS * rdt);
  camera.rotation.y = -g(replayD - replayDD * rdt);

  replayLast = Math.floor(replayI);
} //ReplayUpdate

var seconds = 0;
var secondL = 0;
var secondX = 0;
var posLast = "";

Ding.prototype.update = function (dt) {
  seconds += dt;
  secondL += dt;
  secondX += dt;
  if (camera === undefined) return;

  var lon = camera.Lon();
  var lat = camera.Lat();

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    lat = 0;
    lon = 0;
    console.log("NaN lat lon"); // or alert
  }

  var dir = r(camera.rotation.y);
  var view = r(camera.rotation.x);

  if (dt > 30.0) alert("You have been logged off.\nRunning in the backround?");

  if (hud)
    if (hud.gFps > hud.fpsMin + 0 && secondX > 0.2 && gCustom != 2) {
      // + 8
      secondX = 0;

      if (userID > 0) {
        // Zyklisch eigenes zum Server senden und Andere bekommen

        var pos =
          lat.toFixed(8) +
          ";" +
          lon.toFixed(8) +
          ";" +
          camera.position.y.toFixed(2) +
          ";" +
          dir.toFixed(0) +
          ";" +
          view.toFixed(0) +
          ";" +
          0.0 + // v Geschwindigkeit
          ";" +
          userName;

        if (replayLog) {
          if (replayLog.length > 333) replayLog = replayLog.substring(0, 333);
          pos += encodeURI(";" + replayLog);
          replayLog = "";
        }

        if (multiplay) {
          var userID0 = 0;
          if (posLast != pos) {
            posLast = pos;
            userID0 = userID;
          }
          var xmlhttp = new XMLHttpRequest();
          xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
              if (cEye.map) AvatarsDo(xmlhttp.response);
            }
          };
          xmlhttp.open("GET", "./xchg.php?pos=" + userID0 + ";" + pos, true); // osmgo.org/xchg.php?pos=userID;x;y;z;xr;yr;v äää
          xmlhttp.send();
        }
      } else {
        // no user id yet: Login

        if (userID < -1) {
          userID = -1;
          var xmlhttp = new XMLHttpRequest();
          xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
              var res = xmlhttp.response;
              if (res.length > 199) res = "1;karlos;user/X5";
              res = res.split(";");
              userID = res[0];
              if (res.length > 1) userName = res[1];
              if (dbg > 0) log("!!2!!" + strGET.replace("&", "§"));
              if (simul) {
                userName = "karlos";
                userSet = true;
                stateCity = "ForchHeim";
              }
              if (res.length > 2) {
                stateCity = res[2];
              }
              if (res.length > 3) {
                MapillaryID = "&access_token=" + res[3]; // "&client_id="
              }
            } //http received
          }; //http done

          var url =
            "./login.php?username=" +
            userName +
            "&lat=" +
            latitude +
            "&lon=" +
            longitude;
          var llName = GET_Par("name");
          if (llName) url += "&name=" + llName;
          xmlhttp.open("GET", url, true);
          xmlhttp.send();
        }
      } // userid?
    } //>200ms?

  if (secondL > 2) {
    secondL -= 2;

    /**	if(lowDome) { // lll
						scene.remove(lowDome)
				lowDome = undefined

				//if(hud.gFps>30 && tileDistMax<16)	tileDistMax++
				//if(hud.gFps<20)	tileDistMax--
			}***/

    if (!lowDome && lastLoadz < 9e9) {
      setLowDome();
    }

    if (hud) hud.Fps();

    //var s =      + lat.toFixed(8) +"/"+  lon.toFixed(8) +"/"+ camera.position.y.toFixed(1)
    //	    +  "_" + dir.toFixed(0) +"/"+ view.toFixed(0) +" +"+ (seconds/30).toFixed(0)*30

    var sec = Math.floor(seconds);
    if (
      hud &&
      gCustom != 2
      // (userSet)
    ) {
      if (chat1 == "") {
        if (sec == 6) {
          if (control.controlMode == 3)
            hud.Out([
              "FLIGHT-Mode",
              "ARROW-KEYS: left/right-turn, ahead/back",
              " - - - - ",
              "Press 'x' to change to VIEW- or SEGWAY-Mode",
              "'F1' for help",
            ]);
          else
            hud.Out([
              "Press 'x' to change to SEGWAY, FLIGHT or VIEW-Mode",
              "'F1' for help",
            ]);
        }

        if (sec == 16) hud.Out([""]);
        //(sec== 50)					hud.Out(["If you like to comment","please press 'C' for 'Chat'.","Please add your OSM-Name"," - - - - ","'F1' for help"])
        //(sec== 30) if(control.kmt==0)	hud.Out(["Use keyboard, mouse","or touchscreen","to move or look around","'F1' for help"])
        //(sec==300)					sendMail() //hud.Out(["5 Minutes online","Do you like it?","press 'C' to send a comment"])
        //(sec==600)					hud.Out(["Hi! Do you like this?","Please mail me:","karlos@OSMgo.org"])
      }

      if (sec == 3 * 60 && userName != "karlos") {
        // 90

        var url =
          "./mail.php?username=" + userName + "&lat=" + lat + "&lon=" + lon;
        console.log("url -----------------------------------", url);
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
        // Or this way?:  https://stackoverflow.com/questions/7381150/how-to-send-an-email-from-javascript

        // Geht nicht wenn auf Dreambox ein Passwort ist:
        var dbhttp = new XMLHttpRequest();
        dbhttp.open(
          "GET",
          "https://zi11.ddns.net:3487/web/message?type=3&timeout=6&text=GO 2 Minuten: " +
            stateCity,
          true,
        );
        dbhttp.send();
      }

      if (sec == 5 * 60) {
        // hud.Out(["5 Minutes online","Do you like it?","press 'r' to send a comment"])
        if (
          confirm("5 Minutes online! Would you send me your experience?") ==
          true
        )
          sendMail(); // else window.close_or_crash()
      }
    }
  }

  if (hud) hud.Update(dt, seconds, -camera.rotation.y);

  if (osmDo == 0 && lalo0) {
    if (hud) hud.Out(["Detecting location", "Else: Go to London"]);
  }

  if (osmDo == 0 && lalo0 && seconds > 10) {
    gpsOn = false; // GPS-Simulation
    latitude = 51.50706135; // 51.508
    longitude = -0.12781402; // -0.094//7311
    lalo0 = false;
    tiles = 4; // hier nicht so viel
  }

  if (osmDo == 0 && !lalo0) {
    // Position ist bekannt und OSM-Lessen ist noch anzustoßen
    osmDo = 1;
    osmBuilder.QueryOsmTiles(longitude, latitude);
    teststr = "Read OSM-Data";
    if (mLogo) if (mLogo) mLogo.visible = true;
    /**
		if(seconds>10)
			 writeLogLine("OSMgo:"+strGET+"&name=Default_London")
		else writeLogLine("OSMgo:"+strGET+"|&lon="+longitude+"&lat="+latitude)
		**/
  }

  if (tileLoading) if (mLogo) mLogo.rotation.y += g(0.3); // osmDo==1

  if (osmDo == 1 && osmBuilder.IsOsmDataAvail()) {
    // Overpass-Abfrage/OSM-Laden ist fertig

    if (nodeCount > 150000 && dbg != 1.5) {
      // ccc ccc
      ResetTiles();
      osmBuilder.QueryOsmTiles(longitude, latitude);
    }

    if (!gpsAct) {
      // Beim GPS-Start und -Aktuell je eine Kugel. Avatar: Kegel/Segway/Maskoc
      // log("posX0+"+posX0+"+"+posZ0)
      var mash = new NodeGeo().sph(0.2).maps(mlm.grey_root, posX0, posZ0, 0.5);
      mash.name = "GPS-Aktuell";
      gpsAct = new NodeGeo().sph(0.2).maps(mlm.grey_root, posX0, posZ0, 0.4);
      gpsAct.name = "GSP-START";
      // ää??? Nur die Farben die hier (auf Main-Map) verwendet werden sind später mit (zu viel) Schatten! ???

      ModelPlace(-1, "server", "segway", 0, 0, "obj"); // avatar
    }

    osmDo = 2;
    return; // Nicht gleich weiter, damit es Angezeit wird
  }

  if (osmDo == 2) {
    if (osmBuilder.readJsonData()) return; // Noch nicht fertig
    //  osmBuilder.readJsonData()  // Echte Daten

    if (relFirst) relNeLa = relFirst;
    if (wayFirst) wayNeLaP = wayFirst;
    if (nodeFirst) nodeNeLaP = nodeFirst;
    dtCount = 0;
    for (var i in ways) ways[i].Analyse(); // Die OSM-Daten analysieren, filern, vorbereiten

    var material = mlm.floor2; // land
    if (FilterType > 1) material = FilterMaterial;

    var latIndexL = tileLoading.latIndex;
    var lonIndexL = tileLoading.lonIndex;
    var p = Math.pow(2, diffLevel);
    //???	if(gCustom!=3)  // 3=Garage UND? anderer Server?!!?
    for (ta = 0; ta < p; ta++) {
      // alle View-Tile in der Load-Tile: Ggf. neu Anlegen.
      for (to = 0; to < p; to++) {
        var state = 3; // 0=Canel? 1=toLoad&show. (?2=loading) 3=Visible. 4=Hidden
        var latIndexV = latIndexL * p + ta;
        var lonIndexV = lonIndexL * p + to;
        if (!viewTiles[latIndexV]) {
          viewTileMake(latIndexV, lonIndexV);
          state = 4;
        }
        if (!viewTiles[latIndexV][lonIndexV]) {
          viewTileMake(latIndexV, lonIndexV);
          state = 4;
        }
        var viewTile = viewTiles[latIndexV][lonIndexV];
        viewTile.floor.material = material;
        viewTile.state = state;
        if (state == 4) viewTile.map.visible = false;
      }
    }
    osmDo = 3;
    return;
  }

  if (replayI >= 0) ReplayUpdate(dt); // Immer, aber hier?

  if (osmDo == 3) {
    // All Relations
    if (this.osmRelations(dt)) return; // Noch nicht fertig
    osmDo = 4;
    return;
  }

  if (osmDo == 4) {
    // All ways
    if (dt < 0.5) dtCount = 0;
    if (dt > 0.5 && dbg <= 3) dtCount++;

    if (dtCount < 5) {
      // x mal 50ms=20FPS 125ms = 8 PFS    ODER viele Debug-Ausgaben
      // Solange nicht überlastet: Mehr Rendern
      if (this.osmWays(dt)) return; // Noch nicht fertig
    } else log("x times  dt gross! " + dt);
    osmDo = 5;
    return;
  }

  if (osmDo == 5) {
    // All Nodes
    if (this.osmNodes(dt)) return; // Noch nicht fertig
    osmDo = 6;
    return;
  }

  if (osmDo == 6) {
    // if( this.osmNodes(dt) ) return // Noch nicht fertig
    if (dbg > 2) log("  render END " + new Date().toLocaleTimeString());
    teststr = "OSM ok ";
    //	if(mLogo) mLogo.visible = false
    // pppppppp if(!pack) pack = new Packman()

    if (FilterArray.length > 0) {
      if (FilterCount != FilterArray.length) {
        FilterCount = FilterArray.length;
        if (!tileLoading)
          alert("Filter: " + FilterString + " " + FilterArray.length);
      }
    }
    if (FilterType == 1) {
      for (var f in FilterArray) {
        var osm = FilterArray[f];

        var geometry = new THREE.CylinderGeometry(5, 0, 100, 3);
        var mesh = new THREE.Mesh(geometry, mlm.yellow);
        mesh.osm = osm;
        if (!(osm.idWay >= 0)) osm = nodes[osm.wayNodes[0]]; // way? 1. Node davon merkieren
        mesh.position.x = osm.x;
        mesh.position.z = osm.z;
        mesh.position.y = 100 / 2;
        addMap(mesh, osm.id); // map.add( mesh )
      }
    }

    osmDo = 7;
    var matCo = colors; //if(THREE.REVISION<=83)
    //	matCo    = new THREE.MultiMaterial(colors)
    var material = mlm.floor2;
    if (FilterType > 1) material = FilterMaterial;

    if (tileLoading.state == 2) {
      tileLoading.state = 3;

      var latIndexL = tileLoading.latIndex;
      var lonIndexL = tileLoading.lonIndex;
      var p = Math.pow(2, diffLevel);
      for (ta = 0; ta < p; ta++) {
        for (to = 0; to < p; to++) {
          var latIndexV = latIndexL * p + ta;
          var lonIndexV = lonIndexL * p + to;
          var viewTile = viewTiles[latIndexV][lonIndexV];
          viewTile.floor.material = material;
          //	viewTile.mgeo.computeVertexNormals(); // Farbuebergaenge weich, weil das beim Modell von Alex fehlt
          var mgeo = viewTile.mgeo;
          var ogeo = viewTile.ogeo;
          if (gOptimize < 4) {
            mgeo.sortFacesByMaterialIndex();
            ogeo.sortFacesByMaterialIndex();
          }
          //	if(gOptimize>1) mgeo = new THREE.BufferGeometry().fromGeometry(viewTile.mgeo)
          var mesh = new THREE.Mesh(mgeo, matCo); // mmm
          mesh.receiveShadow = shadow;
          mesh.castShadow = shadow;
          viewTile.map.add(mesh); // Mesh for tile super-geometry
          var more = new THREE.Mesh(ogeo, matCo); // mmm
          more.receiveShadow = shadow;
          more.castShadow = shadow;
          viewTile.map.more.add(more); // Mesh for more super-geometry

          //	viewTile.state = 3//
        }
      }
    }
    tileLoading = false;
    //????	if(gCustom!=3) // Garage &?& anderer Server?
    osmBuilder.LoadOsmTiles(); // check for more to load
    if (osmDo == 7) {
      log("- - Overpass done - -", buildingParts);
      if (mLogo) mLogo.visible = false;
    }
    return;
  } // ==6

  if (osmDo == 7) {
    if (ModelDelete.length > 0) {
      var nr = ModelDelete[0];
      var re = nr - 10000000000;
      if (re > 0) {
        //// REL
        if (rels[re]) {
          var rel = rels[re];
          if (rel.Visible(false)) ModelDelete.shift();
        } //way
      } else if (nr > 0) {
        //// WAY
        if (ways[+nr]) {
          var way = ways[+nr];
          if (way.mesh) way.mesh.visible = false;
          ModelDelete.shift();
        } //way
      } //+way
      else {
        //// NODE
        if (nodes[-nr]) {
          var node = nodes[-nr];
          if (node.mesh) node.mesh.visible = false;
          ModelDelete.shift();
        } //rel
      } //-node
    } //>0
    else {
      osmDo = 8;
    }
    return;
  }

  if (osmDo == 8) {
    if (Houses.length > 0) {
      NodeHouse(Houses[0]);
      Houses.shift();
    } else osmDo = 9;
  }

  if (osmDo == 9) {
    osmDo = 11;
    if (keepDo) {
      var dLat = 1000 / LAT_FAKT;
      keep.LoadAndPlace(
        (longitude - dLat).toFixed(8), // left
        (longitude + dLat).toFixed(8), // right
        (latitude - dLat).toFixed(8), // bottom
        (latitude + dLat).toFixed(8),
      ); // top_
    }
  }

  if (osmDo >= 9) {
    // Fertig: nur updates (gibts nicht beim Renderer)
    if (mLogo) mLogo.rotation.y += g(-0.3);
    //ppppppppp if(pack) pack.Play(seconds)
  }
};

Ding.prototype.osmNodes = function () {
  // aus OSM-Struktur wird TREEjs (interne Funktion von ...)

  if (hud) if (hud.gFps < hud.fpsMin + 0) return true;

  // Alle OSM-Nodes plazieren
  var countdown = 0.11; // s =   15ms+Reserve ~ 16.666ms = 1000/16.666 = 60 FPS
  var dt = 0;
  while (countdown > 0) {
    if (nodeNeLaP) nodeNeLaP.Place();
    if (!nodeNeLaP.next) return false; // nicht weiter, fertig
    nodeNeLaP = nodeNeLaP.next;
    dt = clock.getDelta();
    countdown -= dt;
  }
  return true; // weiter
};

Ding.prototype.osmWays = function () {
  // aus OSM-Struktur wird TREEjs (interne Funktion von ...)

  // Alle OSM-Ways plazieren (ways sind ist Highway und Building und ...)
  // var s = Math.abs( ((wayCount-wayIndex)/wayCount+0.5)/1.5 )
  if (mLogo) {
    var s = mLogo.scale.x - 0.05;
    if (s < 0.2) s = 0.2;
    mLogo.scale.x = s;
    mLogo.scale.y = s;
    //  mLogo.position.y = -0.4 // + s*0.6
  }

  if (!wayNeLaP) return false; // nothing to render yet
  if (hud) if (hud.gFps < hud.fpsMin + 2) return true;

  // Aus OSM-Daten ein 3D-Modell erstellen
  var countdown = 0.11; // s =   15ms+Reserve ~ 16.666ms = 1000/16.666 = 60 FPS
  var dt = 0;
  //log("render::::::: ",wayIndex )
  while (countdown > 0) {
    //log("render- ",wayIndex,dt,countdown)
    wayNeLaP.Place();
    if (!wayNeLaP.next) return false; // nicht weiter, fertig
    wayNeLaP = wayNeLaP.next;
    wayIndex++;
    dt = clock.getDelta();
    countdown -= dt;
  }
  return true; // weiter
};

Ding.prototype.osmRelations = function () {
  // aus OSM-Struktur wird TREEjs (interne Funktion von ...)

  if (hud) if (hud.gFps < hud.fpsMin + 4) return true;

  // Alle OSM-Relationen analysieren
  var countdown = 0.11; // s =   15ms+Reserve ~ 16.666ms = 1000/16.666 = 60 FPS
  var dt = 0;
  while (countdown > 0) {
    if (relNeLa) relNeLa.Place();
    if (!relNeLa.next) return false; // nicht weiter, fertig
    relNeLa = relNeLa.next;
    dt = clock.getDelta();
    countdown -= dt;
  }
  return true; // weiter
};

// http ://osmgo.org/go.html?lat=52.22501&lon=21.00366&ele=360.36&dir=0&view=-48&user=karlos&tiles=3&opt=2&sha=0
// file :///Users/Karl/Dropbox/OSMgo/act/go.html?user=karlos&lat=51.50705&lon=-0.12772&ele=10.00&dir=0&view=-10&tiles=3&opt=9
