import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { log, dbg, g, parMdl, httpx } from "./main.js";
import { addMore } from "./osm.js";

// Repository

/*
Eine OSM-Node "bank" hat ein 3dmr-tag.
Wenn das Modell noch nie geladen wurde, muss es das beim newRepo
sonst reicht eine Refrenz darauf.

Wenn alles gut geht:
Beim place-node wird ein neues object3D angelegt, mit child => repo object

Examples:
02 Tardis - https://osmgo.org/v03.html?km=1&lat=51.49210590&lon=-0.19290818&ele=1.48&dir=48&view=-3&tiles=1
09 Châtel-Montagne - https://osmgo.org/v03.html?km=1&lat=46.11407931&lon=3.68266590&ele=28.10&dir=357&view=-12&tiles=1
14 Chemnitz - https://osmgo.org/v03.html?km=1&lat=50.79482895&lon=12.91840384&ele=69.75&dir=0&view=-35&tiles=1
              https://osm2world.org/demo/?lat=50.7959231&lon=12.9175606&radius=288.59&alpha=1.571&beta=0.785


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

  log("3D Model placing - addRepo id3d:" + id3d + " node.id:" + node.id);
  repoApi = httpx + "3dmr.eu/api/";
  var o3dNode = new THREE.Object3D(); // Ersatz für mesh welches erst als child-child kommt
  o3dNode.osm = node;
  node.mesh3D = o3dNode;

  if (!repo[id3d]) new Repo(node, id3d);

  if (repo[id3d].mesh) {
    // ???????????????? tag direction ??? Delta Singel/Multi wegInFunktion ???
    var info = repo[id3d].info;
    log("ttt Repo: info: " + info);
    o3dNode.add(repo[id3d].mesh.clone());
    //o3dNode.scale.set(info.scale, info.scale, info.scale);
    //o3dNode.rotation.y += g(-info.rotation);
    addMore(o3dNode); //,node
  } else repo[id3d].que.push(o3dNode);

  var dir = node.GetTag("direction", 0) * 1;
  log("ttt Repo: dir = " + dir);

  // node and tagging instance values go to the "mother object" not the mesh:
  o3dNode.rotation.y = g(-dir);
  o3dNode.position.x = node.x;
  o3dNode.position.y = node.GetLLm(0);
  o3dNode.position.z = node.z;
  o3dNode.name = "3dmr:" + id3d;
  node.osm = o3dNode;
  // node<=>NodeO3D =!=> ReproO3D => OBJ-Mesh

  // changed with the new 3dmr?!:
  //o3dNode.rotation.y += g(180);
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
  this.loadInfo();
  repo[id3d] = this;
  return this;
}

Repo.prototype.loadInfo = function () {
  if (dbg > 2) log("listRepo:" + this.id3d);

  var id3d = this.id3d;
  //r url1 = repoApi + "filelist/" + this.id3d;
  var url2info = repoApi + "info/" + this.id3d;

  var xmlhttp2 = new XMLHttpRequest();
  xmlhttp2.onreadystatechange = function () {
    if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
      if (dbg > 2) log("listRepo:" + xmlhttp2.response + "!" + id3d);
      repo[id3d].info = JSON.parse(xmlhttp2.response);
      loadGltf(id3d);
    }
  };
  xmlhttp2.open("GET", url2info, true);
  xmlhttp2.send();
};

function loadGltf(id3d) {
  // gltf Loader
  if (dbg > 2) log("loadRepo:" + id3d, "!");
  // (dbg > 2) log("loadRepo:" + id3d + "," + response, "!");

  if (dbg > 2) log("loadRepo mtl:" + model);
  var url = repoApi + "model/" + id3d; // http ://159.89.12.114/api/model/1
  loading_id3d = id3d;
  var gltfLoader = new GLTFLoader();
  gltfLoader.load(url, useGltf);
}

// node<=>NodeO3D ==> ReproO3D =!=> OBJ-Mesh
var useGltf = function (gltf) {
  var mesh = gltf.scene.clone(); // clone(gltf.scene);
  var id3d = loading_id3d;
  var info = repo[id3d].info;

  // Irgendwo sind da 90 Grad, statt y=Höhe gilt hier?:
  // info.translation[0,1,2] = Breitseite recht/links , Tiefseite vor/zruück, Senkrechte auf/ab

  // repository info (will be removed!) goes to the mesh, not the "mother object"
  mesh.position.x = info.translation[0]; // Rechts
  mesh.position.y = info.translation[2]; // Höhe
  mesh.position.z = info.translation[1]; // Vor
  mesh.scale.set(info.scale, info.scale, info.scale);
  mesh.rotation.y += g(-info.rotation);
  // Positiv meint was: rechter/näher/höher?  Des Modells oder des 0-Punts vom Modell?

  for (var o in repo[id3d].que) {
    log(
      "########### meshRepo id: " +
        id3d +
        " translation: " +
        info.translation +
        " rotation: " +
        info.rotation,
    );

    if (dbg > 2) log("meshRepo instance:" + o);
    var o3dNode = repo[id3d].que[o];

    o3dNode.info = info;
    o3dNode.add(mesh.clone());
    o3dNode.updateMatrixWorld(true);
    addMore(o3dNode);
  } //for
};

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
