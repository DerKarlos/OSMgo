import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// init renderer
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// init scene and camera
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  3000,
);
camera.position.z = 5;

//scene.add(new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 0.5)));

const loader = new GLTFLoader();
let mixer = null;

loader.load(
  "wind.glb",
  function (gltf) {
    console.log("load");
    scene.add(gltf.scene);
    camera.position.set(0, 0, 200);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(object);
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
    }
  },
  undefined,
  function (error) {
    console.error(error);
  },
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener("change", animate); // use if there is no animation loop
controls.minDistance = 2;
controls.maxDistance = 200;
controls.target.set(0, 0, -0.2);
controls.update();

// a light
var light = new THREE.HemisphereLight(0xfffff0, 0x101020, 1.25);
light.position.set(0.75, 1, 0.25);
scene.add(light);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

//  .-------------------

`//loader
      const loader = new GLTFLoader();
      let model;
      loader.load('/mb.glb', (gltf) => {
    model = gltf.scene;
        scene.add(model);
       //scaling
       model.scale.set(.14,.14,.14); // Adjust scale for the model

        let action = mixer.clipAction( gltf.animations[0] , model);
action.play()

mixer.update( 1/60 )

      });`;
