import * as THREE from 'three';
import { dbg, log, g, camera, hud } from './main.js';
import { maps } from './render.js';
import { SinCos } from './controls.js';
import { GetLon2x, GetLat2z } from './osm.js';


var cImage = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
var gImage = new THREE.PlaneGeometry(4, 3, 1, 1) // Buffer

var mImage = new THREE.Mesh(gImage) // global
mImage.name = "Panoramax" //  "Mapillary"
mImage.position.y = -999

export function PanoramaxInit() {
    maps.add(mImage)
}

export function PanoramaxNearest(lat, lon) {

    hud.Out(["Panoramax Image ..."])
    var sc = SinCos(camera.rotation.y, 0.0005) // 0.001 Grad = 111 m


    // https://api.panoramax.xyz/api/search?place_position=${longitude},${latitude}
    var apiUrl = "https://api.panoramax.xyz/api/search?place_distance=0-100&place_position=" + (lon -= sc[0]) + "," + (lat -= sc[1])

    // Fetch the Panoramax data and redirect to the appropriate view
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                PanoramaxImage(data.features[0], data.features[0].assets.hd.href, lat, lon)
            } else {
                hud.Out(["No Panoramax features found for the given coordinates."]);
            }
        })
        .catch(error => {
            console.error("Error fetching Panoramax data:", error);
        });

}


function PanoramaxImage(feature, url) {

    var geo = feature.geometry
    var pro = feature.properties
    var coo = geo.coordinates
    var lon = coo[0]
    var lat = coo[1]

    var x = GetLon2x(lon, lat)
    var z = GetLat2z(lat)

    var ca = feature.properties["view:azimuth"];
    var y = g(360 - ca)
    if (ca == 359 || ca == 0) y = camera.rotation.y

    var dx = camera.position.x - x
    var dz = camera.position.z - z
    var da = Math.atan2(dx, dz)  // Angle in rad
    camera.rotation.x = 0
    camera.rotation.y = da
    camera.position.y = 3

    mImage.position.x = x
    mImage.position.z = z
    mImage.position.y = 3
    mImage.rotation.y = da

    log("Panoramax:" + ca + " " + lon + "/" + lat)
    hud.Out(["Panoramax Image from: " + pro["geovisio:producer"]
        , "camera angle: " + ca // + " test:" + Math.floor(r(da))
        , "position: " + (lon.toFixed(6)) + "' /" + (lat.toFixed(6)) + "'"
        , "captured at: " + pro.exif["Exif.Photo.DateTimeOriginal"]
        , "camera: " + pro.exif["Exif.Image.Model"] + " " + pro.exif["Exif.Image.Make"]
    ])

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




/*

DIALOG:   https://elk.zone/en.osm.town/@karlos/113822229491177438
BEISPIEL: https://framagit.org/llongour/panoramax-redirector/-/blob/main/index.html
OSM MAP:  https://www.openstreetmap.org/#map=18/53.545330/9.966525
OSMGO:    https://osmgo.org/go.html?km=1&lat=53.54532284&lon=9.96509047&ele=9.77&dir=261&view=-10&user=thuringia&dbg=1&con=1&tiles=4&opt=2
    DA?:  https://api.panoramax.xyz/api/search?place_position=${longitude},${latitude}
    OK    https://api.panoramax.xyz/api/search?place_position=9.966525,53.545330
         "https://api.panoramax.xyz/api/search?place_position=9.968852007601187,53.54527250793043"
    UI:   https://api.panoramax.xyz/#focus=pic&pic=258088c3-12ef-43bc-9204-948b76abed6f
API JPG:  https://api.panoramax.xyz/#focus=pic&pic=${firstFeatureId}
    OK    https://panoramax.openstreetmap.fr/images/25/80/88/c3/12ef-43bc-9204-948b76abed6f.jpg
          https://api.panoramax.xyz/#focus=pic&pic=https://panoramax-storage-public-fast.s3.gra.perf.cloud.ovh.net/main-pictures/a8/27/cf/7e/ca07-41ac-8420-3e5ce12b0ea1.jpg

    place_distance=0-100


DIR:      "...Exif.Image.Orientation": "1", "properties": { "view:azimuth": 87,      // azimuth is the horizontal angle (compass)  Altitude is up down

EXAMPE:   https://osmgo.org/go.html?km=1&lat=51.50077746&lon=-0.11902338&ele=18.15&dir=100&view=-10&user=thuringia&dbg=1&con=1&tiles=4&opt=2



It works! I had to discover place_distance=0-100, feature.properties["view:azimuth"] and more. One may test it here:
https://osmgo.org/go.html?km=1&lat=51.50077746&lon=-0.11902338&ele=18.15&dir=100&view=-10&user=thuringia&dbg=1&con=1&tiles=4&opt=2
Press "P" for Picture and the most near by will get visible, sometimes only far away or inside buildings. The handling of OSMgo is horrible!



*/
