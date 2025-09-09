import * as THREE from 'three';
import { log, dbg, r, g, camera, hud } from './main.js';
import { maps, MapillaryID } from './render.js';
import { SinCos } from './controls.js';
import { GetLon2x, GetLat2z } from './osm.js';


var client_id = "SECRET"/*************

Client ID:  ...


https://www.mapillary.com/developer/api-documentation/

Get nearest:
https://a.mapillary.com/v3/images/?closeto=11.0863,49.7154&radius=500&per_page=1&client_id=...

Get data:
https://a.mapillary.com/v3/images/M5Y9IKDOPhgx5B_g0Xr8hg?client_id=...

Get jpg:
https://d1cuyjsrcm0gby.cloudfront.net/M5Y9IKDOPhgx5B_g0Xr8hg/thumb-2048.jpg    320/640/1024/2048


	
type	"FeatureCollection"
features	
0	
type	"Feature"
properties	
ca	359
camera_make	"GoPro"
camera_model	"HERO4 Black"
captured_at	"2015-10-02T12:10:25.000Z"
key	"..."
pano	false
user_key	"..."
username	"barentz"
geometry	
type	"Point"
coordinates	
0	11.086022
1	49.714663


lat=49.71354344652981&lon=11.086181402206423
file:///Users/Karl/Dropbox/OSMgo/act/go.html?lat=49.71354344652981&lon=11.086181402206423

https://a.mapillary.com/v3/images/?radius=9500&per_page=1&closeto,11.086181402206423,49.71354344652981&client_id=...


****/

var MapillaryURL = "https://graph.mapillary.com/" // "https://a.mapillary.com/v3/"
// https://graph.mapillary.com/images/?radius=1500&per_page=1&closeto=-0.12072092753179367,51.49854422313819&client_id=M0tndV9yQW5qT09SN2gxd1pM

var cImage = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
var gImage = new THREE.PlaneGeometry(4, 3, 1, 1)
var mImage = new THREE.Mesh(gImage) // global
mImage.name = "Mapillary"
mImage.position.y = -999

function MapillaryInit() {
	maps.add(mImage)
}

export function MapillaryNearest(lat, lon) {

	hud.Out(["Mapillary Image ..."])
	var sc = SinCos(camera.rotation.y, 0.0005) // 0.001 Grad = 111 m


	// https://a.mapillary.com/v3/ images/?radius= 500&per_page=1&closeto=11.0863,49.7154&client_id=...  OLD
	// https://graph.mapillary.com/images/?radius=1500&per_page=1&closeto=-0.1207,51.4985&access_token=M0tndV9yQW5qT09SN2gxd
	var url = MapillaryURL + "images/?radius=1500&per_page=1&closeto=" + (lon -= sc[0]) + "," + (lat -= sc[1]) + MapillaryID

	// 400 Not a valid http POST request
	// [Error] Failed to load resource: the server responded with a status of 500 (Internal Server Error) (images, line 0)

	var xmlhttp = new XMLHttpRequest()
	xmlhttp.onreadystatechange = function () {
		if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)) {
			var data = JSON.parse(xmlhttp.responseText)
			if (data.features.length < 1) hud.Out(["Mapillary Image: not in range of 500m"])
			else MapillaryImage(data.features[0], lat, lon)
		}
	}
	xmlhttp.open("GET", url, true)
	xmlhttp.send()

}


function MapillaryImage(feature, camLat, camLon) {


	var geo = feature.geometry
	var pro = feature.properties
	var coo = geo.coordinates
	var lon = coo[0]
	var lat = coo[1]

	var x = GetLon2x(lon, lat)
	var z = GetLat2z(lat)
	var y = g(360 - pro.ca)
	if (pro.ca == 359 || pro.ca == 0) y = camera.rotation.y

	var dx = camera.position.x - x
	var dz = camera.position.z - z
	var da = Math.atan2(dx, dz)  // Angle in rad
	camera.rotation.y = da

	mImage.position.x = x
	mImage.position.z = z
	mImage.position.y = 3
	mImage.rotation.y = da
	log("Mapillary:" + pro.ca + " " + lon + "/" + lat)
	hud.Out(["Mapillary Image from: " + pro.username
		, "camera angle: " + pro.ca + " test:" + Math.floor(r(da))
		, "position: " + (lon.toFixed(6)) + "' /" + (lat.toFixed(6)) + "'"
		, "captured at: " + pro.captured_at
		, "camera: " + pro.camera_model + " " + pro.camera_make
	])

	// https://d1cuyjsrcm0gby.cloudfront.net/M5Y9IKDOPhgx5B_g0Xr8hg/thumb-2048.jpg    320/640/1024/2048
	var url = "https://d1cuyjsrcm0gby.cloudfront.net/" + pro.key + "/thumb-2048.jpg"


	var
		loader = new THREE.TextureLoader(); // instantiate a loader
	loader.load(	// load a resource
		url,		// resource URL
		function (logoTexture) {		// Function when resource is loaded
			cImage.map = logoTexture	// The actual texture is returned in the event.content
			mImage.material = cImage
		},
		function (xhr) {	// Function called when download progresses
			if (dbg > 2) log((xhr.loaded / xhr.total * 100) + '% loaded  TextureLoader Image');
		},
		function (xhr) {	// Function called when download errors
			log('An error happened  TextureLoader Image');
		}
	)//loader

}
