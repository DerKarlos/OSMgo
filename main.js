import * as THREE from "three";
import { StereoEffect } from "three/addons/effects/StereoEffect.js";
import { ColladaLoader } from "three/addons/loaders/colladaloader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { goControl, max_dt } from "./controls.js";
import { HeadUpDisplay } from "./hud.js";
import {
  Style,
  Ding,
  maps,
  ModelPlace,
  replayI,
  DDMM2D,
  set_replayI,
} from "./render.js";
import { nodes } from "./render_node.js";
import { KeepRight } from "./keepright.js";
import { PanoramaxInit } from "./panoramax.js";

///////////// Read, store and acces URL parameter  ///////////
var HTTP_GET_VARS = new Array(); // HTTP-Parameter sind viele Name=Wert Paare. Das "Array" hat keine Nummern-Index sondern verwendet den Namen! Genial.

export var strGET = document.location.search.substr(
  1,
  Math.min(document.location.search.length, 500),
); // No unlimited string
if (dbg > 0) log("!!1!!" + strGET.replace("&", "§"));
if (strGET != "") {
  var gArr = strGET.split("&");
  for (var i in gArr) {
    // Alle HTTP-Parameter
    var v = "";
    var vArr = gArr[i].split("="); // In Name und Wert teilen
    if (vArr.length > 1) {
      v = vArr[1];
    } // Wert vorhanden? Merken.
    HTTP_GET_VARS[unescape(vArr[0])] = unescape(v); // Wert mit Index=Namen in Array.
  }
}

//// Name suchen und Wert zurückgeben
export function GET_Par(v) {
  if (!HTTP_GET_VARS || !HTTP_GET_VARS[v]) {
    return "";
  } // Name als Index nicht vorhanden? return Leerstring
  return HTTP_GET_VARS[v]; // ansonsen return Wert zum Namen
}

//// Name suchen und Wert zurückgeben
export function GET_ParD(v, d) {
  if (!HTTP_GET_VARS || !HTTP_GET_VARS[v]) {
    return d;
  } // Name als Index nicht vorhanden? return Defaultwert
  return HTTP_GET_VARS[v]; // ansonsen return Wert zum Namen
}

//////////////  ! NUR HIER sollten globale Variablen sein, wenn es denn sein muß /////////////////////////////////////////////
// (var in ein Init scheiben würde sie verstecken, this ist auch umständlich? Oder doch eine Klasse Globals?)

export var replayLog = "";
export function set_replayLog(txt) {
  replayLog = txt;
}
export var dbg = GET_ParD("dbg", 0) * 1;
export function set_dbg(s) {
  dbg = s;
}
export function inc_dbg() {
  dbg++;
}
export var DevOrConsOn = false;
export var posX0 = 0;
export var posY0 = 10;
export var posZ0 = 0;
export function set_posXZ0(x, z) {
  ((posX0 = x), (posZ0 = z));
}
export function set_posY0(v) {
  posY0 = v;
}

export var waysMax = GET_ParD("wmx", 1000000000) * 1;
export var gServer = GET_ParD("ser", 1) * 1; // 1=osm 2=OSMBuilding 3=Chemnitz
export var gCustom = GET_ParD("cu", 0) * 1; // 1=Jan/Berlin/OSMBuilding-Tiles 2=Wien 3=WASM? 3?4=Parkhaus
export var terrNr = GET_ParD("err", 20) * 1;
export var httpx = "https://";
export var hud = false;

////////////////// .  Places to test:
// Adlerhorst: 47942638 http://localhost:5173/go.html?km=1&lat=49.71520275&lon=11.08625504&ele=8.72&dir=0&view=-10&user=karlos&dbg=0&con=1&tiles=5&opt=2&id=47942638
// skillion dom: 136144289 http://localhost:5173/index.html?km=1&lat=48.57240397&lon=13.46545083&ele=101.00&dir=0&view=-10&user=karlos&dbg=0&con=1&tiles=5&opt=2&id=136144289
// onion fo: 255320206    http://localhost:5173/index.html?km=1&lat=49.71994150&lon=11.05622809&ele=30.26&dir=255&view=-11&user=karlos&dbg=0&con=1&tiles=5&opt=2&id=255320206
// pyramidal:  364176784
// pyramide: http://localhost:5173/go.html?km=1&lat=49.69554288&lon=11.04548212&ele=6.45&dir=354&view=-4&user=karlos&dbg=0&con=1&tiles=5&opt=2
// Kuppelhalle: http://localhost:5173/go.html?km=1&lat=49.60240471&lon=11.01915721&ele=9.16&dir=17&view=-5&user=karlos&dbg=0&con=1&tiles=5&opt=2
// Westminster: http://localhost:5173/?km=1&lat=51.50135242&lon=-0.12337933&ele=83.77&dir=149&view=-19&user=karlos&dbg=0&con=1&tiles=5&opt=2

export var touchable = "createTouch" in document;
export var sceneContainer = document.getElementById("container");
export var loading = document.getElementById("loading");
loading.innerHTML = "";

var tileDing = null;

export var stereoOn = -1; /* Undefinded */
export function set_stereoOn(v) {
  set_stereoOn = v;
}
if (GET_Par("card")) stereoOn = GET_Par("card") * 1;
//( navigator.platform=="iPad" ) stereoOn = 0
if (isIpadOS()) stereoOn = 0;

if (stereoOn == -1) {
  if (touchable && sceneContainer.offsetWidth > sceneContainer.offsetHeight) {
    stereoOn = 1;
  } else {
    stereoOn = 0;
  }
  if (stereoOn == 1) {
    //!!!!!!!!!!!!!!!!!!!    var ok = confirm("Run in VR/Stereo-Mode?\n(like Google Cardboard)")
    //!!!!!!!!!!!!!!!!!!!    if (ok != true) stereoOn = 0
  }
}

export var myURL =
  window.location.protocol +
  "//" +
  window.location.host +
  "" +
  window.location.pathname;
myURL = myURL.slice(0, myURL.lastIndexOf("/"));
if (dbg > 2) log("myURL: ", myURL);
if (myURL.substring(0, 5) == "http:") {
  httpx = "https://";
  if (dbg > 0) log("::::::::::    You are using http://    :::::::::::");
}

export var latitude = GET_ParD("lat", 0) * 1; // Wie macht man aus String Nummer???
export var longitude = GET_ParD("lon", 0) * 1;
export function set_lalo(la, lo) {
  latitude = la;
  longitude = lo;
}
export var lalo0 = latitude == 0 && longitude == 0;
export function reset_lalo0() {
  lalo0 = false;
}
export var parMdl = GET_ParD("mdl", 99) * 1;

export var viewLevel = GET_ParD("vil", 17) * 1; // !
export function set_viewLevel(to) {
  viewLevel = to;
}
export var diffLevel = GET_ParD("dil", 1) * 1; // 1=16,2*2=4   2=15,4*4=16
export var gAviation = GET_ParD("avi", 0) * 1;

export var defaultSpecies = "-";
if (Math.abs(latitude) < 37) defaultSpecies = "palm"; // +38.876634 -34.833136  Dubai: 25.2647227&lon=55.2924146

export var osmBnode_id = 1001;
export function inc_osmBnode_id() {
  osmBnode_id++;
}

export var raycaster = new THREE.Raycaster();

export var scene;
export var camera;
export var cameraShadow;
export var cameraHUD;
export var stereoEffect;
export var webGLRenderer;
export var sceneHUD;
export var control;
export var light;

var mixers = [];
var winds = [];
var wind_gltf;

//r map  // map of actual tile to be placed in
export var tileDistMax = GET_ParD("tiles", 5) * 1;
export function set_tileDistMax(to) {
  tileDistMax = to;
}

export var dbgOsmID = 136144289; // passau skillton 136144290 // eye skillion 1133013729 // 136144289 // 136144290
export var dbgReturn = false;
export var dbgRange = 200; //or 0.200 for tests
if (tileDistMax == 0) dbgRange = 0;
export var dbgID = GET_Par("id");
if (dbgID) {
  if (dbgID[0] != "+") dbgReturn = true;
  dbgOsmID = dbgID * 1;
}

export var fly = GET_ParD("fly", 4);
export var multiplay = GET_ParD("multi", 0) * 1;

export var userInput = "";
export var userSet = true; // not used !!!
export function set_userSet(v) {
  userSet = v;
}
export var userName = GET_ParD("user", "user").toLowerCase();
export function set_userName(name) {
  userName = name;
}

if (
  userName == "" ||
  userName == "user" ||
  userName == "noname" ||
  !isAlphaNum(userName)
) {
  userName = "user";
  userSet = false;
}

if (multiplay && !userSet) {
  var inputText = "myname";
  userInput = prompt("Enter a name to multiplay", inputText);
  if (dbg > 0) log("input userName: ", userInput);
  if (userInput != null && userInput != inputText && isAlphaNum(userInput)) {
    userName = userInput.toLowerCase();
    userSet = true;
  } else {
    multiplay = false;
  }
}

if (dbg > 0) log("userName: ", userName, "multiplay: ", multiplay);

export var userID = -2;
export function set_userID(id) {
  userID = id;
}

export var avatars = [];
export var cEye = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
export var cSky = new THREE.MeshBasicMaterial({ side: THREE.BackSide });

export var meshXQuaFly = undefined; // neuer Avatar als Fly/Quatrotor/NICHT segway
export var mesh1Quatro = new THREE.Mesh();
export var mesh2Segway = new THREE.Mesh();
export function set_mesh2Segway(s) {
  mesh2Segway = s;
  mesh2Segway.visible = control.controlMode == 2;
}
export var mesh3FlyCol = new THREE.Mesh();

export var DrawDelta = 0.05; // 5cm abstand zwischen den "Schichten" Wie Punkte über Striche. Besser Shape-Merge??

export var defHeight = GET_ParD("hei", 0);
export var viewAbstr = GET_ParD("abs", 0);

export var keep;
export var windSpin = [];
//r propeller

export var shadowD = 1;
export var shadow = GET_Par("sha") == "1"; // Slows down like from 35 to 25 FPS
export function set_shadow(s) {
  shadow = s;
}
if (touchable == 1) shadow = false; //stereoOn

export var osmDo = 0; // 0:laden 1:fertig&3dfileload 2:CREATEviewTiles 3:Relations 4:Ways 5:Nodes 6:filter 7:loadNext/deleteLoad 8:Houses 9:keepRight 11:done
export function set_osmDo(d) {
  osmDo = d;
}

export var simul = 0;
if (GET_Par("sim")) {
  // Parameter not "0"
  simul = 1;
  log("OSM-Simulation");
  gpsOn = false; //??
  latitude = 49.7151; // NORD Simulations-Default FO
  longitude = 11.087; // ORST
  lalo0 = false;
}
export function set_simul(v) {
  simul = v;
}

export var opt = 0;
if (tileDistMax > 3) opt = 2;

export var gOptimize = GET_ParD("opt", opt) * 1;
export function set_gOptimize(s) {
  gOptimize = s;
}
export var replay = GET_ParD("replay", 0);
// var replayLog = ""
if (gCustom == 2) gOptimize = 0;
if (gServer == 3) {
  viewLevel = 16;
  diffLevel = 0;
}

if (replay) {
  var xmlhttpN = new XMLHttpRequest();
  xmlhttpN.onreadystatechange = function () {
    log(xmlhttpN.readyState, xmlhttpN.status);
    if (xmlhttpN.readyState == 2 && xmlhttpN.status == 404)
      alert("Replay file missing: " + replay);
    if (xmlhttpN.readyState == 4 && xmlhttpN.status == 200) {
      log("replay replay replay replay replay replay replay ");
      //alert("##################test################")

      if (gAviation) {
        replay = xmlhttpN.response.split("$");
        set_replayI(1);
      } else {
        replay = xmlhttpN.response.split("<br>");
        set_replayI(0);
      }
      var line = replay[replayI];

      if (gAviation) {
        var l = line.split(",");
        // 0      1          2 3        !4 5         !6 7    8!!   9      10  11 12
        // $GPRMC,HHMMSS.uuu,A,BBBB.BBBB,b,LLLLL.LLLL,l,GG.G,RR.R ,DDMMYY,M.M,m,F*PP
        // $GPRMC,082832.000,A,4934.9869,N,01052.9761,E,0.00,12.78,010618,   , ,D*51
        latitude = DDMM2D(l[3] * 1);
        if (l[4] == "S") latitude *= -1;
        longitude = DDMM2D(l[5] * 1);
        if (l[6] == "W") longitude *= -1;
        if (camera) camera.position.y = 55;
      } else {
        var l = line.split(";");
        //                   0 1         2         3      4   5     6     7        8      9    10
        // 2017-06-03 17:57:11;1;48.196042;11.810881;101.00;0.0;-10.0;0.000;46979831;myname;extra
        latitude = l[2] * 1;
        longitude = l[3] * 1;
        if (camera) camera.position.y = l[4];
      }
      lalo0 = false;
      osmDo = 0;
      if (hud) hud.Out(["Replay found"]);
    }
  };
  xmlhttpN.open("GET", "user/" + replay + ".log", true);
  xmlhttpN.send();
  //alert("Replay START")
  osmDo = 22;
  //  latitude  = 0.00000111
  lalo0 = false;
}

//  0,1,2: AJAX todo/aktiv/done/simuliert per JS-Datei,   -1:  Simulation starten
export var gpsOn = true;
if (GET_Par("gps")) gpsOn = false;
export function set_gpsOn(v) {
  gpsOn = v;
}
if (!lalo0) {
  gpsOn = false;
}
if (longitude < -180) longitude += 360;
if (longitude > +180) longitude -= 360;

export var keepDo = GET_Par("keep") == "1";

// !!, Kleinere Ecke der letzten geladenen Tile - aber in Metern!
export var lastLoadx = -9e9;
export var lastLoadz = +9e9;
export var lastLoadEx = +9e9;
export var lastLoadEz = -9e9;
export function set_lastLoad(x, z, Ex, Ez) {
  lastLoadx = x;
  lastLoadz = z;
  lastLoadEx = Ex;
  lastLoadEz = Ez;
}

export var accuOld = 99999;
export function set_accuOld(val) {
  accuOld = val;
}
export var gamePoints = 0;

export var clock = new THREE.Clock();
export var conCl = new THREE.Clock();
export var skyDome;
export var lowDome;

export var mlm = null;
export var fovDefault = GET_ParD("zoom", 1) * 40;
export var lightX = 6; //  0=genau aus Richtung Süden
export var lightZ = 100000; // weit weg im Süden (=PLUS!)
export var lightY = 150000; // genau so hoch?: 45 Grad Sonnenstand

export var NEAR = 0.05;
export var FAR = 10000;

export var iji = "b4UzKKIU64c7mJbsDCsSvL";

//	     terr("Bad colour: "+col,way,err)  http ://osmgo.org/go.html?lat=50.10692258&lon=8.67174460&ele=161.44&dir=328&view=-2&user=karlos&dbg=1&fps=10&con=1&tiles=4&opt=2
export function terr(t, way, a) {
  var l = t;
  if (a) l = l + "," + a;
  if (dbg > 2) log(l);
  replayLog += "!" + l;
  if (!way) return;
  if (!Number.isInteger(way.id)) return;
  if (terrNr <= 0) return;
  terrNr--;

  way.terr = l;
  way.AddTag("Tag Error:", l);
  var m = Math.floor(way.wayNodes.length / 2);
  var n = nodes[way.wayNodes[m]];
  if (!n || gAviation) return;
  var geometry = new THREE.CylinderGeometry(5, 0, 300, 3);
  var mesh = new THREE.Mesh(geometry, mlm.red);
  mesh.position.y = 300 / 2;
  mesh.position.x = n.x;
  mesh.position.z = n.z;
  mesh.osm = way;
  maps.add(mesh);
}

export function err(t, a, b, c, d, e) {
  if (dbg > 2) log(t, a, b, c, d, e);
}

export function log(t, a, b, c, d, e) {
  var l = t;
  if (a) l = l + "," + a;
  if (b) l = l + "," + b;
  if (c) l = l + "," + c;
  if (d) l = l + "," + d;
  if (e) l = l + "," + e;
  console.log(l);
  replayLog += "!" + l;
  // writeLogLine("@"+l)
}

export function g(grad) {
  //   Vollkreis (360) in Rad (2*Pi) wandeln
  return (grad / 180) * Math.PI;
}

export function r(grad) {
  return (grad * 180) / Math.PI;
}

export function isAlphaNum(TCode) {
  if (TCode.length < 2) return false;
  for (var i = 0; i < TCode.length; i++) {
    var char1 = TCode.charAt(i);
    var cc = char1.charCodeAt(0);
    if ((cc > 47 && cc < 58) || (cc > 64 && cc < 91) || (cc > 96 && cc < 123));
    else return false;
  }
  return true;
}

export function isIpadOS() {
  return (
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 2 &&
    /MacIntel/.test(navigator.platform)
  );
}

export function setDome() {
  var ts0 = (lastLoadEx - lastLoadx) * (tileDistMax + 1);
  var ts1 = (lastLoadz - lastLoadEz) * (tileDistMax + 2);
  ts0 = Math.floor(ts0 * 100) / 100; // cm genau reicht
  ts1 = Math.floor(ts1 * 100) / 100;
  // log("dome hole: ",ts0,ts1)

  var points = [];
  points.push(new THREE.Vector2(+FAR, +FAR));
  points.push(new THREE.Vector2(+FAR, -FAR));
  points.push(new THREE.Vector2(-FAR, -FAR));
  points.push(new THREE.Vector2(-FAR, +FAR));
  points.push(new THREE.Vector2(+FAR, +FAR));
  var shape = new THREE.Shape(points);
  points = [];
  points.push(new THREE.Vector2(+ts1, +ts0));
  points.push(new THREE.Vector2(-ts0, +ts0));
  points.push(new THREE.Vector2(-ts0, -ts1));
  points.push(new THREE.Vector2(+ts1, -ts1));
  points.push(new THREE.Vector2(+ts1, +ts0));
  shape.holes.push(new THREE.Shape(points));
  var geometry = new THREE.ShapeGeometry(shape);

  var mate = new THREE.MeshLambertMaterial({
    color: mlm.white,
    side: THREE.DoubleSide,
  });
  lowDome = new THREE.Mesh(geometry, mate);
  lowDome.rotation.x = g(90);
  lowDome.position.y = DrawDelta * 6;
  lowDome.name = "LowDome";
  scene.add(lowDome);

  var loaderSky = new THREE.TextureLoader(); // instantiate a loader
  loaderSky.load(
    // load a resource
    "models/sky_dome4.jpg", // resource URL
    function (texture) {
      // Function when resource is loaded
      cSky.map = texture; // The actual texture is returned in the event.content
      var tdm = tileDistMax;
      if (tdm < 4) tdm = 4;
      var skysiz = (tdm * ts0) / (tileDistMax + 1); // FAR * 0.98; // 400 // (tileDistMax*1) *111  //
      skyDome = new THREE.Mesh(
        new THREE.SphereGeometry(
          skysiz,
          32 * 2,
          16 * 2,
          0,
          g(360),
          g(0),
          g(180),
        ),
        cSky,
      ); // 18,105
      skyDome.scale.y = 0.7; // zur Kante   // 0.4 = below fog
      skyDome.name = "SkyDome";
      scene.add(skyDome);
    },
    function (xhr) {
      // Function called when download progresses
      if (dbg > 2)
        log((xhr.loaded / xhr.total) * 100 + "% loaded  SKY TextureLoader");
    },
  );
}

function Init() {
  // init renderer
  var SCREEN_WIDTH = window.innerWidth;
  var SCREEN_HEIGHT = window.innerHeight;
  var SHADOW_MAP_WH = 512; // ttts 4096

  webGLRenderer = new THREE.WebGLRenderer({ antialias: true });
  webGLRenderer.setSize(window.innerWidth, window.innerHeight);
  webGLRenderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  webGLRenderer.setClearColor(0x734a08); // 3D-Hintergrundfarbe:   //    0x734a08=brown 	 0x00BFFF=deep sky blue
  webGLRenderer.setPixelRatio(window.devicePixelRatio);
  webGLRenderer.autoClear = false;
  sceneContainer.appendChild(webGLRenderer.domElement); //export var sceneContainer = document.getElementById('container');
  //document.body.appendChild(webGLRenderer.domElement);

  // init scene and camera
  scene = new THREE.Scene();
  //scene.fog = new THREE.Fog( 0x00BFFF, (tileDistMax*111*0.8), (tileDistMax*111)) // FAR*0.5, FAR*0.7 );
  camera = new THREE.PerspectiveCamera(
    fovDefault,
    SCREEN_WIDTH / SCREEN_HEIGHT,
    NEAR,
    FAR,
  ); // fov, aspect,   near, far

  // Lights
  var ambie = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambie); // 0.7 6.0 ??? tttc
  light = new THREE.DirectionalLight(0xffffff, 1.0); // color, intensity   1.0 0.8
  //tttl = new THREE.SpotLight( /***/ 0xffFFff, 1.0, 9, Math.PI / 2);    //   color, intensity, distance, angle, penumbra, decay )
  light.position.set(lightX, lightY, lightZ); // todo: shadow wollowing camera!!!
  //ght.target.position.set(0, 0, 0);

  if (shadow) {
    log("SHADOW on");
    // https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow
    webGLRenderer.shadowMap.enabled = true;
    webGLRenderer.shadowMap.type = THREE.PCFShadowMap; // BasicShadowMap  PCFShadowMap PCFSoftShadowMap

    light.castShadow = true;
    light.shadow.mapSize.width = SHADOW_MAP_WH;
    light.shadow.mapSize.height = SHADOW_MAP_WH;
    light.shadow.camera.near = 0.5; // default
    light.shadow.camera.far = 500; // default
    //ght.shadow.bias = 0.000000001 //Kantenschärfe?
    //cameraShadow = new THREE.PerspectiveCamera(fovDefault / 200/*40 BreiteHöhe^Schärfe des Schattens*/, 1, lightY / 2, lightY * 2) // !ZWEITE Kammaera! Nimmt Schatten auf?
    //light.shadow = new THREE.DirectionalLightShadow(cameraShadow) // !ZWEITE Kammaera! Nimmt Schatten auf?
  }
  scene.add(light);

  if (dbg > 2)
    log(
      "Platform:" +
        navigator.platform +
        "tttd w:" +
        SCREEN_WIDTH +
        " h:" +
        SCREEN_HEIGHT,
    ); // iPhone 980 1461       Quer:  980 h:551

  var stereoMode = 0; // 1=Schielen
  if (stereoOn) stereoEffect = new StereoEffect(webGLRenderer, stereoMode);
  else {
    cameraHUD = new THREE.OrthographicCamera(0, 0, 0, 0, 0, 500); // HUD camera, viewport to match screen dimensions is set in .Resize
    sceneHUD = new THREE.Scene(); // Create also a custom scene for HUD.
    var ambie = new THREE.AmbientLight(0x444444);
    sceneHUD.add(ambie); // Auch für HUD Licht, sonst ist da alles Schwarz
  }

  control = new goControl(webGLRenderer, camera);
  if (replay) control.controlMode = 1;

  // MODELLE woanders

  if (!stereoOn) hud = new HeadUpDisplay(scene, sceneHUD);
  mlm = new Style();
  keep = new KeepRight();
  tileDing = new Ding();

  var onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      var percentComplete = (xhr.loaded / xhr.total) * 100;
      if (dbg > 2) log(Math.round(percentComplete, 2) + "% downloaded");
    }
  };

  // Loader für mesh1Quatro=View (Quadro-ding)
  /** The drone is just a symbol for the control mode like the plane and the Segway. But yes, it is rather irritating. ** /
    if (!simul && parMdl > 0)
        new ColladaLoader().load(
            'models/' + "Quadrotor" + '.dae' // resource URL
            , function (collada) {
                var children = collada.scene.children
                for (var c in children) {
                    var x = children[c]
                    x.name = "m1" + c
                    x.receiveShadow = shadow
                    x.castShadow = shadow

                    for (var s in x.children) {
                        var y = x.children[s]
                        y.receiveShadow = shadow
                        y.castShadow = shadow
                    }

                    mesh1Quatro.add(x)
                }

                var s = 0.10

                mesh1Quatro.scale.set(s, s, s)
                mesh1Quatro.rotation.set(g(-90), g(0), g(-90))
                mesh1Quatro.position.y = -0.2
                mesh1Quatro.name = "mesh1Quatro"
                mesh1Quatro.receiveShadow = shadow
                mesh1Quatro.castShadow = shadow
                mesh1Quatro.visible = (control.controlMode == 1)
                meshXQuaFly.add(mesh1Quatro)
            }// Function when resource is loaded
            , onProgress
        )//load1
    /***/

  //  if(gCustom!=2 && control.controlMode==3)
  //  {   if(fly) {

  if (dbg > 0) log("::: FLY: " + fly);
  var flyMdl;
  if (fly == "1") flyMdl = "Orion3";
  if (fly == "2") flyMdl = "Lancet_TNG";
  if (fly == "3") flyMdl = "Frog_TNG";
  if (fly == "4") flyMdl = "Cessna"; // https://3dwarehouse.sketchup.com/model/2ec64783b238fd1cffb94dfdd6ddfaf0/Cessna-172-Skyhawk
  if (fly == "5") flyMdl = "t65xwing"; // https://3dwarehouse.sketchup.com/model/e7e49b8668cc78c0c0663e1068c82b73/Incom-T65-X-Wing
  if (fly == "6") flyMdl = "TIE_Fighter"; // https://3dwarehouse.sketchup.com/model/9ab4ff8d-df5c-4464-b5bd-66e4c88e5135/TIE-Fghter
  if (fly == "7") flyMdl = "Quadrotor"; // https://3dwarehouse.sketchup.com/model/ufbec2914-9384-42b1-ae0a-81987b3fdd0d/Parrot-ARDrone-Quadcopter
  if (fly == "8") flyMdl = "delorean"; // https://3dwarehouse.sketchup.com/model/7e749028bd0b1013cd564112824591c2/DeLorean-BTTF-3

  /***/
  // http://localhost:5173/index.html?km=1&lat=48.85662040&lon=2.29365652&ele=242.79&dir=341&view=-45&user=karlos&dbg=0&con=1&tiles=5&opt=2
  var loader = new ColladaLoader(); // Loader für mesh3FlyCol=Flieger
  if (!simul && parMdl > 0)
    loader.load(
      "models/" + flyMdl + ".dae", // resource URL
      function (collada) {
        var children = collada.scene.children;
        for (var c in children) {
          var x = children[c]; // maps c0= meshXQuaFly  mesh3FlyCol Scene, c0, c1 von 0-2, c0, c22 = Group1
          x.name = "x" + c;
          x.receiveShadow = shadow;
          x.castShadow = shadow;

          for (var s in x.children) {
            var y = x.children[s];
            y.receiveShadow = shadow;
            y.castShadow = shadow;
          }

          mesh3FlyCol.add(x);
        }

        var s = 0.01;
        var r = -90;
        var p = 4;
        if (fly == "1") s = 0.05;
        if (fly == "4") {
          s = 0.02;
          r = 180;
          p = -1.0;
        }
        if (fly == "5") {
          s = 0.02;
          r = 90;
          p = +3.0;
        }
        if (fly == "6") {
          s = 0.02;
          r = 90;
          p = +3.0;
        }
        if (fly == "7") {
          s = 0.2;
          r = 0;
          p = -2.0;
        }
        if (fly == "8") {
          s = 1 / 32;
          r = 180;
          p = -0.7;
        }

        mesh3FlyCol.scale.set(s, s, s);
        mesh3FlyCol.rotation.x = g(-90);
        mesh3FlyCol.rotation.z = g(r);
        mesh3FlyCol.position.x = p;
        mesh3FlyCol.name = "mesh3FlyCol";
        mesh3FlyCol.receiveShadow = shadow;
        mesh3FlyCol.castShadow = shadow;
        mesh3FlyCol.visible = control.controlMode == 3;
        meshXQuaFly.add(mesh3FlyCol);
        //mFlight.visible=false // Klötzchenflieger weg

        //if(fly=="Cessna") {
        //      propeller = maps.children[0].children[1].children[0].children[1].children[0].children[21]
        //}
      }, // Function when resource is loaded
      onProgress,
    ); //load
  /***/

  meshXQuaFly = new THREE.Mesh(); // buildDemoFlieger();   fff
  meshXQuaFly.position.copy(camera.position);
  meshXQuaFly.rotation.copy(camera.rotation);
  //at.add(mFlight)
  meshXQuaFly.receiveShadow = shadow;
  meshXQuaFly.castShadow = shadow;
  meshXQuaFly.name = "meshXQuaFly";
  //    if(dbg!=1.5)
  maps.add(meshXQuaFly);
  control.Flight.init(meshXQuaFly);

  var loaderEye = new THREE.TextureLoader(); // instantiate a loader
  if (!simul)
    loaderEye.load(
      // load a resource
      "eye_smiley.png", // resource URL     'eye_green/robot/smiley.png'
      function (texture) {
        // Function when resource is loaded
        cEye.map = texture; // The actual texture is returned in the event.content
      },
      function (xhr) {
        // Function called when download progresses
        if (dbg > 2)
          log((xhr.loaded / xhr.total) * 100 + "% loaded  EYE TextureLoader");
      },
    );

  PanoramaxInit();

  if (dbg == 1.3) ModelPlace(4799, "server", "burg", 0, 0, "obj");
  if (dbg == 1.2) ModelPlace(4799, "server", "car", 0, 0, "obj");

  loadGLB("models/windmile.glb");

  // render
  animate();
} // Init Ende /////////////////////////////

// http://localhost:5173/?km=1&lat=49.66761890&lon=11.21531506&ele=187.17&dir=243&view=-54
// https://www.openstreetmap.org/#map=17/49.666545/11.218618
// http://localhost:5173/?km=1&lat=54.86221286&lon=8.64370561&ele=261.06&dir=78&view=-81&user=karlos&dbg=0&con=1&tiles=5&opt=2
//
// https://www.openstreetmap.org/#map=15/54.87152/8.66087
// http://localhost:5173/?km=1&lat=54.86369843&lon=8.64492576&ele=111.52&dir=31&view=-10&tiles=11
// https://osmgo.org/v03.html?lat=54.86369843&lon=8.64492576&ele=111.52&dir=31&view=-10&tiles=11
//
// Merde: The height 0 of the windmill is the rotating axis! could we move it with Blender?
// The rotating is nor a closed cycle, could we edit it with Blender?
// I have never seen that part below the condola back. Could we remove it by editing wit Blender?

export function addGLB(x, z) {
  winds.push(new THREE.Vector2(x, z));
}

function loadGLB(url) {
  const loader = new GLTFLoader();

  loader.load(
    url,
    function (gltf) {
      wind_gltf = gltf;
      //animateGLB(new THREE.Vector2(0, 0));
    },
    undefined,
    function (error) {
      console.error("Error loading GLB:", error);
    },
  );
}

function animateGLB(wind) {
  var gltf = wind_gltf;
  const object = clone(gltf.scene);
  //nst object = gltf.scene; //.clone();

  if (gltf.animations && gltf.animations.length > 0) {
    var mixer = new THREE.AnimationMixer(object);
    gltf.animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
    mixers.push(mixer);
  }

  object.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const bbox = new THREE.Box3().setFromObject(object);
  const posi = new THREE.Vector3(wind.x, -bbox.min.y, wind.y);
  object.position.add(posi);
  scene.add(object);
}

///////////////////////////////////////////////// Main-Start //////////////////////////////////////////////////////////////

// NOT WORKING on iPhone Safari: window.blockMenuHeaderScroll = false;

//var dbg = GET_ParD("dbg", 1) * 1

///////  Sowas wie ein Main-Klassen-Konstruktor
Init();
//scene.add(new THREE.Mesh(new THREE.BoxGeometry()))

export function animate() {
  var dt = clock.getDelta() + 0.000001;

  if (dt > max_dt) {
    var t = "dt: " + Math.floor(dt * 1000) + "ms";
    if (dt > 1) t += " ------------------";
    console.log(t);
    // if(dt>0.5) hud.Out(["Animation cycle > 0.5s","All moves are stopped,","all keys are released."])
    dt = max_dt; // schummel aber beruhigt Bewegungen
    control.Stop();
  }

  if (wind_gltf) {
    if (winds.length > 0) {
      animateGLB(winds.pop());
    }

    if (mixers.length > 0) {
      for (var mixer_index in mixers) {
        var mixer = mixers[mixer_index];
        mixer.update(dt);
      }
    }
  }

  control.update(dt);

  if (tileDing) tileDing.update(dt);
  camera.updateProjectionMatrix(); // kein HUD? Wohl nur bei Resize in controls.js

  for (var w in windSpin) {
    windSpin[w].rotation.z += dt;
  }

  webGLRenderer.clear(); // Warum so umständlich?

  if (stereoOn) stereoEffect.render(scene, camera);
  else {
    webGLRenderer.render(scene, camera);
    webGLRenderer.render(sceneHUD, cameraHUD); // Render HUD on top of the scene.
  }

  requestAnimationFrame(animate);
}

//   <!-- Todo: http-equiv="Content-Type" content="text/html" -->>
//  <!-- Todo: styles from old OSMgo go.html? -->
