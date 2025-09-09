import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
//import { OBJLoader } from 'three/addons/loaders/objLoader.js';
//import { MTLLoader } from 'three/addons/loaders/mtlloader.js';

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
  //r url1 = repoApi + "filelist/" + this.id3d;
  var url2info = repoApi + "info/" + this.id3d;

  var xmlhttp2 = new XMLHttpRequest();
  xmlhttp2.onreadystatechange = function () {
    if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
      if (dbg > 2) log("listRepo:" + xmlhttp2.response + "!" + id3d);
      repo[id3d].info = JSON.parse(xmlhttp2.response);

      loadRepo(id3d);

      //var xmlhttp1 = new XMLHttpRequest();
      //xmlhttp1.onreadystatechange = function () {
      //  if (xmlhttp1.readyState == 4 && xmlhttp1.status == 200) {
      //    loadRepo(id3d, xmlhttp1.response);
      //  }
      //};
      //xmlhttp1.open("GET", url1, true);
      //xmlhttp1.send();
    }
  };
  xmlhttp2.open("GET", url2info, true);
  xmlhttp2.send();
};

function loadRepo(id3d) {
  // GLB Loader
  // MTL/OBJ Loader
  if (dbg > 2) log("loadRepo:" + id3d, "!");
  // (dbg > 2) log("loadRepo:" + id3d + "," + response, "!");
  //var files = response.split("\r");
  //if (files.length < 2) files = response.split("\n");
  //var model;
  //for (var i in files) {
  //  var f = files[i];
  //  if (dbg > 2) log("loadRepo file:" + f.substr(f.length - 4));
  //  if (f.substr(f.length - 4) == ".obj") model = f.substr(0, f.length - 4);
  //}

  //if (model)
  {
    if (dbg > 2) log("loadRepo mtl:" + model);
    var url = repoApi + "model/" + id3d; // http ://159.89.12.114/api/model/1
    //var url = repoApi + "filelatest/" + id3d + "/"; // http ://159.89.12.114/api/filelatest/1/bench.obj
    //var mtl = model + ".mtl";
    //mtl = mtl.replace(/ /g, "_");
    //var materialOptions = new Object();
    //materialOptions.side = THREE.DoubleSide;
    loading_id3d = id3d;
    var glbLoader = new GLBLoader();
    //r mtlLoader = new MTLLoader();
    //lLoader.setCrossOrigin(""); // Karl!: Weill es im MTLoader fehlte. Wie ist es bei neuen Versionen von Three.js ???
    //lLoader.setMaterialOptions(materialOptions);
    //lLoader.setPath(url);

    glbLoader.load(url, meshRepo); // {
    // materials.preload();
    // var objLoader = new OBJLoader();
    //objLoader.setMaterials(materials);
    //objLoader.setPath(url);
    //if (dbg > 2) log("loadRepo obj:" + model);

    //objLoader.load(
    //  model + ".obj", // Filename
    //  meshRepo,
    //  undefined,
    //  undefined,
    //, id3d // Achtung!:  Der OBJLoader muss an zwei stellen um ",that" erweiert werden !!!
    //); //objLoader
    //}); //mtlLoader
  } // model
}

// node<=>NodeO3D ==> ReproO3D =!=> OBJ-Mesh
var meshRepo = function (mesh) {
  var id3d = loading_id3d;
  var info = repo[id3d].info;

  /*  {
        "id": 14,
        "revision": 2,
        "title": "Technology Center Chemnitz E-G",
        "lat": 50.7953227004307,
        "lon": 12.917106896638899,
        "license": 0,
        "desc": "Technology Center Chemnitz House E-G located in Chemnitz / Saxony / Germany. Terms of Use: https://help.sketchup.com/en/article/3000049 Nr. 10.",
        "author": "5294793",
        "date": "2018-04-26",
        "rotation": 0.0,
        "scale": 1.0,
        "translation": [-0.26, 3.31, 0.0],
        "tags": {"building": "yes"},
        "categories": ["tall"]
      }
  */

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
