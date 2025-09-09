import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/objLoader.js";
import { MTLLoader } from "three/addons/loaders/mtlloader.js";

import { log, dbg, g, parMdl, httpx } from "./main.js";
import { addMore } from "./osm.js";

// Repository

/*
Eine OSM-Node "bank" hat ein 3dmr-tag.
Wenn das Modell noch nie geladen wurde, muss es das beim newRepo
sonst reicht eine Refrenz darauf.

Wenn alles gut geht:
Beim place-node wird ein neues object3D angelegt, mit child => repo object

zip -d Archive.zip \*.DS_Store
zip -d Archive.zip "__MACOSX*"


*/

var repo = []; // Array of used 3D-Models
var repoApi;
var loading_id3d = undefined;

// THREE.ImageUtils.crossOrigin = '';

export function addRepo(node, id3d) {
  if (id3d * 1 > parMdl) return false; // no models!

  if (id3d == "yes") return true; // don't render, it is replaced by some model nearby

  //if(id3d=="4")
  //	return  // eiffel TEST !!!!!!!!!!!!!

  log("3D Model placing - addRepo:" + id3d + "," + node.id);
  repoApi = "http ://localhost//api//";
  repoApi = httpx + "osmgo.org//models//api//";
  repoApi = httpx + "159.89.12.114/api/";
  repoApi = httpx + "3dmr.eu/api/";
  var o3dNode = new THREE.Object3D(); // Ersatz für mesh welches erst als child-child kommt
  o3dNode.osm = node;
  node.mesh3D = o3dNode;

  if (!repo[id3d]) new Repo(node, id3d);

  if (repo[id3d].mesh) {
    // ???????????????? tag direction ??? Delta Singel/Multi wegInFunktion ???
    var info = repo[id3d].info;
    o3dNode.add(repo[id3d].mesh.clone());
    o3dNode.scale.set(info.scale, info.scale, info.scale);
    o3dNode.rotation.y += g(-info.rotation);
    addMore(o3dNode); //,node
  } else repo[id3d].que.push(o3dNode);

  var dir = node.GetTag("direction", 0) * 1;
  o3dNode.rotation.y = g(-dir);
  o3dNode.position.x = node.x;
  o3dNode.position.y = node.GetLLm(0);
  o3dNode.position.z = node.z;
  o3dNode.name = "3dmr:" + id3d;
  node.osm = o3dNode;
  // node<=>NodeO3D =!=> ReproO3D => OBJ-Mesh
  return true;
}

function Repo(node, id3d) {
  if (dbg > 2) log("Repo:" + id3d);
  this.node = node;
  this.id3d = id3d;
  this.o3d = new THREE.Object3D(); // parent of 3d mesh
  this.mesh = undefined;
  this.que = [];
  this.info = "";
  this.listRepo();
  repo[id3d] = this;
  return this;
}

Repo.prototype.listRepo = function () {
  if (dbg > 2) log("listRepo:" + this.id3d);

  var id3d = this.id3d;
  var url1 = repoApi + "filelist/" + this.id3d;
  var url2 = repoApi + "info/" + this.id3d;

  var xmlhttp2 = new XMLHttpRequest();
  xmlhttp2.onreadystatechange = function () {
    if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
      if (dbg > 2) log("listRepo:" + xmlhttp2.response + "!" + id3d);
      repo[id3d].info = JSON.parse(xmlhttp2.response);

      //1111
      var xmlhttp1 = new XMLHttpRequest();
      xmlhttp1.onreadystatechange = function () {
        if (xmlhttp1.readyState == 4 && xmlhttp1.status == 200) {
          loadRepo(id3d, xmlhttp1.response);
        }
      };
      xmlhttp1.open("GET", url1, true);
      xmlhttp1.send();
      //1111
    }
  };
  xmlhttp2.open("GET", url2, true);
  xmlhttp2.send();
};

function loadRepo(id3d, response) {
  // MTL/OBJ Loader
  if (dbg > 2) log("loadRepo:" + id3d + "," + response, "!");
  var files = response.split("\r");
  if (files.length < 2) files = response.split("\n");
  var model;
  for (var i in files) {
    var f = files[i];
    if (dbg > 2) log("loadRepo file:" + f.substr(f.length - 4));
    if (f.substr(f.length - 4) == ".obj") model = f.substr(0, f.length - 4);
  }

  if (model) {
    if (dbg > 2) log("loadRepo mtl:" + model);
    var url = repoApi + "filelatest/" + id3d + "/"; // http ://159.89.12.114/api/filelatest/1/bench.obj
    var mtl = model + ".mtl";
    mtl = mtl.replace(/ /g, "_");
    var materialOptions = new Object();
    materialOptions.side = THREE.DoubleSide;
    loading_id3d = id3d;
    var mtlLoader = new MTLLoader();
    mtlLoader.setCrossOrigin(""); // Karl!: Weill es im MTLoader fehlte. Wie ist es bei neuen Versionen von Three.js ???
    mtlLoader.setMaterialOptions(materialOptions);
    mtlLoader.setPath(url);

    mtlLoader.load(mtl, function (materials) {
      materials.preload();
      var objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath(url);
      if (dbg > 2) log("loadRepo obj:" + model);

      objLoader.load(
        model + ".obj", // Filename
        meshRepo,
        undefined,
        undefined,
        //, id3d // Achtung!:  Der OBJLoader muss an zwei stellen um ",that" erweiert werden !!!
      ); //objLoader
    }); //mtlLoader
  } // model
}

// node<=>NodeO3D ==> ReproO3D =!=> OBJ-Mesh
var meshRepo = function (mesh) {
  var id3d = loading_id3d;
  //repo[id3d].mesh = mesh // tttr
  var info = repo[id3d].info;
  // ??? keine 90 Grad?  XYZ Beschreiben!!!

  // Irgendwo sind da 90 Grad, statt y=Höhe gilt hier?:
  // info.translation[0,1,2] = Breitseite recht/links , Tiefseite vor/zruück, Senkrechte auf/ab
  mesh.position.x += info.translation[0]; // Rechts
  mesh.position.y += info.translation[2]; // Höhe
  mesh.position.z += info.translation[1]; // Vor
  // Positiv meint was: rechter/näher/höher?  Des Modells oder des 0-Punts vom Modell?

  for (var o in repo[id3d].que) {
    log(
      "###################  meshRepo:" +
        id3d +
        " " +
        info.translation +
        " " +
        info.rotation,
    );

    if (dbg > 2) log("meshRepo instance:" + o);
    var o3dNode = repo[id3d].que[o];

    // Warum nicht schon oben?
    o3dNode.scale.set(info.scale, info.scale, info.scale);
    o3dNode.rotation.y += g(-info.rotation);
    o3dNode.info = info;

    o3dNode.add(mesh.clone());
    o3dNode.updateMatrixWorld(true);
    addMore(o3dNode);
  } //for
};

/*

Store of Orgin inverts between edits and online


Mehr an pezzi
https://www.openstreetmap.org/way/469922151 = Unterkante über Oberkante!
Wie Editierst Testest du? Nur F4 ist nicht gut

22683
TypeError: uniforms.ambientLightColor is undefined[Weitere Informationen]

Nach aktuellem Loader keine Crashes mehr (ohne returns)

Church9: ZIP hat nur MTL ohne OBJ. Help mailed. Done
Chemnitz11: Zeichengitter für kleinen Baum ging bis ins Gebäude. Für SketchUp .skp unreleveant, wurden dann die Texturen links auf dem Gebäude "übermalt" beim Export in .obj.







	OBJLoader.prototype = {

		constructor: OBJLoader,

		load: function ( url, onLoad, onProgress, onError ,that) { // karl

			var scope = this;

			var loader = new THREE.FileLoader( scope.manager );
			loader.setPath( this.path );
			loader.load( url, function ( text ) {

				onLoad( scope.parse( text ), that ); // karl


The Ka statement specifies the ambient reflectivity using RGB values.


http://www.fileformat.info/format/wavefrontobj/egff.htm


Eiffel:
Level/min_height 0/0m   1/57.63   2/115.73'134   3/276.13


*/
