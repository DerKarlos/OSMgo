import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r77/three.js">< /script>
// <script src='http://threejs.org/examples/js/controls/OrbitControls.js'>< /script>

// init renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// init scene and camera
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 3000);
camera.position.z = 5;
//var controls = new THREE.OrbitControls(camera)


var box = new THREE.BoxGeometry(1, 1, 1);
var boxMesh = new THREE.Mesh(box);
boxMesh.updateMatrix();

var gNode = new THREE.CircleGeometry(1, 16)
var m = new THREE.Matrix4().makeTranslation(1, 1, 1)
m.makeRotationX(1.3)
gNode.applyMatrix4(m)
var circlerMesh = new THREE.Mesh(gNode);
circlerMesh.updateMatrix();  // !!!!!

var singleGeometry = BufferGeometryUtils.mergeGeometries([boxMesh.geometry, circlerMesh.geometry], false)

var material = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
var mesh = new THREE.Mesh(singleGeometry, material);
scene.add(mesh);

// a light
var light = new THREE.HemisphereLight(0xfffff0, 0x101020, 1.25);
light.position.set(0.75, 1, 0.25);
scene.add(light);

// render
requestAnimationFrame(function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
})
