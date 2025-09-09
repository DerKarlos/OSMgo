import { addRepo } from "./repo.js";
import {
  dbgOsmID,
  dbgReturn,
  GET_ParD,
  dbg,
  set_dbg,
  log,
  err,
} from "./main.js";
import { partView, ModelPlace, ModelDelete } from "./render.js";
import { nodes, Node } from "./render_node.js";
import { Way, ways, LlPos, set_llPos } from "./render_way.js";

///////////////////////////////////////////////////////////////////////////////
////// Klasse: Rel (ation) rrr                                         ////////
///////////////////////////////////////////////////////////////////////////////

export var rels = [];
export function reset_rels() {
  rels = [];
}
export var relFirst;
var relNeLaI = 0; // Init

export function Rel(id) {
  // iii

  if (id == 13462323) {
    log("ttt rel id !!!");
  }

  if (rels[id]) {
    this.id = 0; // Wird auch als Kennung für "gibt es" genutzt
    return; // Rel war schon da
  }
  this.id = id;

  this.tags = [];
  this.values = [];

  if (relNeLaI) relNeLaI.next = this;
  relNeLaI = this;
  if (!relFirst) relFirst = this;

  this.mmbrs = [];
  this.types = [];
  this.roles = [];

  this.typeMain = undefined;
  rels[id] = this;
  if (dbg >= 4) log("new Rel ", id);
} ////end constructor of Rel

Rel.prototype.AddMember = function (member, type, role) {
  /*with (this)*/ {
    // log("AddMember",member, type, role)
    if (this.mmbrs === undefined) {
      log("MIST!rm", this, member);
      return;
    }
    this.mmbrs.push(member); //??*!
    this.types.push(type);
    this.roles.push(role);
  }
};

Rel.prototype.AddTag = function (tag, value) {
  /*with (this)*/ {
    if (!this.tags) {
      log("tags MIST!rt", this.id, tag, value, this);
      alert("Rel.prototype.AddTag " + this.id);
      return;
    }
    this.tags.push(tag);
    this.values.push(value);
    //log("Rel:AddTag",this.tags.length,tag+":"+value)
  }
};

Rel.prototype.GetTag = function (tag) {
  /*with (this)*/ {
    for (var t in this.tags) {
      //log(this.tags[t],tag)
      if (this.tags[t] == tag) {
        return this.values[t];
      }
    }
    return false;
  }
};

Rel.prototype.Visible = function (val) {
  /*with (this)*/ {
    for (var m in this.mmbrs) {
      if (this.roles[m] != "part") continue;
      var way = ways[this.mmbrs[m]];
      if (!way) return false;
      if (way.mesh) way.mesh.visible = val;
    }
    return true;
  }
};

Rel.prototype.Type3d_model = function () {
  /*with (this)*/ {
    if (GET_ParD("mdl", 1) * 1 == 0) return; // no models!
    if (this.model) return; // already done
    this.model = this.GetTag("model");

    var server = this.GetTag("server");
    var format = this.GetTag("format");
    if (!format) format = "obj";
    for (var m in this.mmbrs) {
      switch (this.roles[m]) {
        case "center":
          if (this.types[m] != "node") return;
          var node = nodes[this.mmbrs[m]];
          ModelPlace(this.id, server, this.model, node.x, node.z, format);
          break;
        case "hide":
          if (this.types[m] == "node") ModelDelete.push(-this.mmbrs[m]);
          if (this.types[m] == "way") ModelDelete.push(+this.mmbrs[m]);
          if (this.types[m] == "rel")
            ModelDelete.push(+this.mmbrs[m] + 10000000000);
          break;
      }
    }
  }
};

Rel.prototype.TypeLevel = function () {
  /*with (this)*/ {
    for (var m in this.mmbrs) {
      var mmbr = this.mmbrs[m];
      var type = this.types[m];
      switch (this.roles[m]) {
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

          if (dbg > 2) log("level shell type!=way", this.id, m, this.roles[m]);
          continue;

        case "buildingpart":
          continue; // Not handled yet: indoor
      } //role
    } //mmbrs
  }
};

Rel.prototype.TypeShell = function () {
  /*with (this)*/ {
  }
};

Rel.prototype.TypeMultipolygon = function (hide) {
  /*with (this)*/ {
    // mmm
    if (!hide) hide = false;

    var mid;
    if ((mid = this.GetTag("3dmr")))
      log("3dmr-Relation: Multipolygon not coded!!!!!");

    this.holes = []; // shapes
    this.outer = []; // ways
    this.nodes = []; // wayNodes
    this.parts = 0;

    for (var m in this.mmbrs) {
      if (this.types[m] != "way") {
        if (dbg > 2) err("Multipolygon mmbr != way! " + this.id + " " + m);
        return;
      }
      var way = ways[this.mmbrs[m]];
      if (!way) {
        /*err("Multipolygon with unknown way! "+this.id+" "+m+" "+this.mmbrs[m])*/ continue;
      } // no return, just drop the inner
      switch (this.roles[m]) {
        case "inner":
          var shape = way.Shape();
          if (this.holes.length < 111)
            if (shape)
              //???
              this.holes.push(shape); // only closed shapes yet
          break;
        case "outer":
          if (hide) {
            way.typeMain = "R" + this.id;
            continue;
          } // Don't show
          this.outer.push(way);
          var node0 = way.wayNodes[0];
          var nodeN = way.wayNodes[way.wayNodes.length - 1];
          if (node0 != nodeN) {
            // outer way part only
            if (dbg == 9)
              log(
                "multipolligone: " + node0 + "-" + nodeN + "-" + this.nodes[0],
              );
            var fits = 0;
            if (this.nodes.length == 0) {
              this.nodes = way.wayNodes;
              this.parts = 1;
              continue;
            }
            if (this.nodes[this.nodes.length - 1] == node0) {
              this.nodes.pop();
              this.nodes = this.nodes.concat(way.wayNodes);
              fits = 1;
            } // new part-start after  colleted parts
            else if (this.nodes[this.nodes.length - 1] == nodeN) {
              this.nodes.pop();
              this.nodes = this.nodes.concat(way.wayNodes.reverse());
              fits = 1;
            } // new part-end   after  colleted parts
            else if (nodeN == this.nodes[0]) {
              way.wayNodes.pop();
              this.nodes = way.wayNodes.concat(this.nodes);
              fits = 1;
            } // new part-end   before colleted parts
            else if (node0 == this.nodes[0]) {
              var poped = way.wayNodes.reverse();
              poped.pop();
              this.nodes = poped.concat(this.nodes);
              fits = 1;
            } // new part-start before colleted parts

            if (fits) this.parts++;
            else this.parts = -9990909;
          } else this.parts = -9990909;
          break;
      } //switch
    } // for

    //if(this.outer.length >1)   err("Multipolygon with >1 outer!",this.id)
    if (this.outer.length == 0) {
      if (dbg > 2) err("Multipolygon with no outer!", this.id);
      return;
    }

    if (this.parts > 1) {
      // not bad but not ok !!! ???
      var way = new Way(0);
      var nods = way.wayNodes;
      var wtgs = way.tags;
      var vals = way.values;
      var wid = way.id;

      way.wayNodes = this.nodes;
      way.tags = this.tags;
      way.values = this.values;
      way.typeMain = "multipoligon";
      way.id = this.id; // "relation/" + this.id
      var type;
      if ((type = this.GetTag("building"))) way.building(type);
      if ((type = this.GetTag("building:part"))) {
        way.building(type);
        way.typeMain = undefined;
        way.tags = wtgs;
        way.valuess = vals;
        way.nodes = nods;
        way.id = wid;
      }
      if ((type = this.GetTag("landuse"))) way.landuse(type);
      return;
    }

    for (var o in this.outer) {
      var way = this.outer[o];
      if (!way) {
        /*err("Multipolygon with outer unknown way! "+this.id+" "+outer[o])*/ continue;
      }

      if (way.wayNodes[0] != way.wayNodes[way.wayNodes.length - 1]) continue; // no way parts yet ///////////??
      if (this.holes.length > 0) way.holes = this.holes; // ??? always? Not all inner are in all outer !!!
      //else log("rel 0 holes! Rel-id"+id)
      if (this.tags.length > 1) {
        // Tags at relation, not at outer? Move to outer
        if (way.tags.length > 0) {
          /*log("Multipolygon tags also at outer!",  this.id, outer[o],way.id)*/
        } else {
          way.tags = this.tags;
          way.values = this.values;
        }
      }
    }

    if (!way.GetTag("area"))
      // A multip. with an Outer must be an area
      way.AddTag("area", "yes");

    //(GetTag("highway" ))   way.("yes")
    if (this.GetTag("building")) {
      way.building("yes");
      way.typeMain = "MuPo" + this.id;
    }
    if (this.GetTag("building:part")) {
      way.building("yes");
      way.typeMain = undefined;
      way.tags = [];
    }
  }
}; // Multi

var mid;

Rel.prototype.TypeBuilding = function () {
  /*with (this)*/ {
    // bbr bbr bbr bbr bbr bbr bbr bbr

    var mid;
    if ((mid = this.GetTag("3dmr"))) log("3dmr-Relation: not coded!!!!!");

    if (partView < 1) return;

    for (var m in this.mmbrs) {
      if (m.id * 1 == dbgOsmID) log("Debug Way Place, ID: ", m.id, this);
      else if (dbgReturn) return;

      var role = this.roles[m];
      if (role == "inner") continue; // ?? todo!
      if (role == "part") continue; // ??
      if (role.substring(0, 3) == "als ") alert("'als ' in" + rel.id); // !!! http ://www.openstreetmap.org/relation/3342625
      if (role != "outer" && role != "outline") {
        // Any other role should be a relatoin

        if (this.types[m] != "relation") {
          if (dbg > 2)
            log("building xxx type not rel", this.id, m, this.types[m]);
          continue;
        }
        var rel = rels[m];
        if (rel) rel.Place(partView >= 0 /*true/*hide??*/);
        continue;
      }

      /// outer/outline/<noting=building> ///
      var type = this.types[m];
      switch (type) {
        case "way":
          var way = ways[this.mmbrs[m]];
          if (!way) {
            if (dbg > 2)
              err(
                "Multipolygon with MISSIG outer way !" +
                  this.id +
                  " " +
                  m +
                  " " +
                  this.types[m],
              );
            continue;
          }
          //	way.AddTag("building:part","yes")
          //	way.building(type)
          if (!way.GetTag("building:part")) {
            if (dbg != 25) way.typeMain = "R" + this.id; // Not a part? hide outer
            // Way: Saint Peter's Basilica (244159210)
            // Relation: 18531045
            // https://demo.f4map.com/?lat=41.90218920247352&lon=12.454193830490114&zoom=16&camera.phi=0&camera.theta=80#lat=41.9021150&lon=12.4535604&zoom=18&camera.theta=63.908&camera.phi=79.641
            // http://localhost:5173/index.html?km=1&lat=41.90166071&lon=12.45956552&ele=47.98&dir=75&view=-8&user=karlos&dbg=2&con=1&id=+18531045&tiles=5&opt=2

            var mid;
            if ((mid = way.GetTag("3dmr"))) {
              log("3dmr-Relation-OUTER");

              //// Copy of WAY-Code
              var node;
              var x = 0;
              var z = 0;
              for (var n in way.wayNodes) {
                // Jede Node ..
                var wayNode = nodes[way.wayNodes[n]];
                if (n == 0) {
                  var node = new Node(0, 11, 22);
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
          var relId = this.mmbrs[m];
          if (!rels[relId]) {
            if (dbg > 2) err("rel member rel missing", this.id, m, relId);
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
  /*with (this)*/ {
    // ppp
    if (!hide) hide = false;
    if (this.typeMain) return;

    if (this.id * 1 == dbgOsmID)
      log("Debug Relation Place, ID: ", this.id, this);
    // set_dbg(9)
    else if (dbgReturn) return;

    set_llPos(LlPos(this));
    this.typeMain = this.GetTag("type");
    //log("RELATION Place:",this.typeMain,this.id,this.mmbrs.length)
    switch (this.typeMain) {
      case "3d_model":
        this.Type3d_model();
        break;
      case "multipolygon":
        this.TypeMultipolygon(hide);
        break;
      case "building":
        this.TypeBuilding();
        break;
      //case "level":			TypeLevel()				;break
      //case "shell":			TypeShell()				;break

      //??? complex relatoins of relations! with levels(=indoor=notYet, including "shell"(outer) of level)
      //	The levels are in DIFFERENT buildings - seems to work
      //	if I don't handle indoor yet, the shell should be dropped - and -  ther is no other building in on part

      // rel type building outer: no view if partShow =??
      // Extra rel damit es weg geht? Wie macht Jan das? http ://www.openstreetmap.org/relation/147095#map=19/48.13779/11.57597
    }

    if (this.id * 1 == dbgOsmID) set_dbg(2);
  }
};
