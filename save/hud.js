//////////////////////////////////////////////////////////
//// hud.js - HUD: HeadUpDisplay with Kompass, Logo,  ////
////                    Debug-Features/Test-Ausgaben  ////
////          UND!: Raytracer                         ////
//////////////////////////////////////////////////////////



var textColour = "rgba(255,255,0,0.5)"  // dunkelblau(0,0,172,0.75    gelb(255,255,0,65)       habwegs druchsichtig
var textPx = 26


// KLASSE HeadUpDisplay ////////////////////
function HeadUpDisplay(scene, sHUD) {
	// Es gibt vor der OSM-scene eine eigene Scene für das HUD. Da könne man eine beliebie 3D-Weld plazieren,
	// erst mal aber nur eine große Bitmap über das obere Viertel des Bildschirms
	// und das drehende Logo

	// var gl = webGLRenderer.context    // will not help with that shit Firefox-Errors
	// gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)

	//// LOGO //////////////////
	var cLogo = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
	var geometry = new THREE.PlaneBufferGeometry(0.3, 0.3, 1, 1)
	mLogo = new THREE.Mesh(geometry)  // mLogo ist global für den Loader
	mLogo.name = "logo"
	mLogo.position.z = -1 / 2
	mLogo.position.y = +0.35
	if (sHUD) sHUD.add(mLogo)

	var loader = new THREE.TextureLoader(); // instantiate a loader
/*!*/	loader.load(    			// load a resource
		'osmlogo.png',			// resource URL
		function (logoTexture) {	// Function when resource is loaded
			if (dbg > 2) log('done: TextureLoader');
			cLogo.map = logoTexture // The actual texture is returned in the event.content
			mLogo.material = cLogo
			mLogo.material.transparent = true
		},
		function (xhr) {	// Function called when download progresses
			if (dbg > 2) log((xhr.loaded / xhr.total * 100) + '% loaded  TextureLoader');
		},
		function (xhr) {	// Function called when download errors
			log('An error happened  TextureLoader');
		}
	)


	//// HeadUpDisplay-Construcktor: COMPAS /////////////////////////

	// Alle Variablen nur temporär, an Three übergeben und vergessen
	var canvas = document.createElement('canvas')
	canvas.width = 256
	canvas.height = canvas.width / 2

	var context = canvas.getContext('2d')
	context.fillStyle = "rgba(0,0,0,0.2)" // dunkel, gut durchsichtig
	context.fillRect(0, 0, canvas.width, canvas.height) //ääöö
	context.font = "Bold 31px Arial"
	context.fillStyle = textColour

	for (var a = 0; a < 5; a++) {
		var t = "WSENW".substr(a, 1)
		var w = context.measureText(t).width
		var l = context.measureText("'").width
		context.fillText(t, canvas.width / 4 * a - w / 2, canvas.height / 2 + 10)
		context.fillText("'", canvas.width / 4 / 3 * (a * 3 + 1) - l / 2, canvas.height / 2 + 10)
		context.fillText("'", canvas.width / 4 / 3 * (a * 3 + 2) - l / 2, canvas.height / 2 + 10)
	}


	var compasTexture = new THREE.Texture(canvas)
	compasTexture.wrapS = THREE.RepeatWrapping;
	compasTexture.needsUpdate = true
	var material = new THREE.MeshBasicMaterial({ map: compasTexture, side: THREE.FrontSide }) // DoubleSide Nur von Unten Durchsichtig? Blend-Parameter???
	material.transparent = true

	var rad = 0.1
	var geometry = new THREE.SphereGeometry(rad, 32, 32)
	var mesh = new THREE.Mesh(geometry, material)
	mesh.position.z = -1
	if (sceneHUD) sceneHUD.add(mesh)
	this.mCompass = mesh

	// COMPAS ende


	//// INFO und DBG - CANVAS /////////////

	// Konstruktor - Instqanz-Variablen für zyklische Änderungen
	this.canvas = document.createElement('canvas')
	this.canvas.width = 1024
	this.canvas.height = this.canvas.width
	this.context = this.canvas.getContext('2d')
	this.context.font = "Bold " + textPx + "px Arial"

	this.texture = new THREE.Texture(this.canvas)  // hud
	this.matCanv = new THREE.MeshBasicMaterial({ map: this.texture })
	this.matCanv.transparent = true

	var x = 1.0
	this.mHUD = new THREE.Mesh(new THREE.PlaneBufferGeometry(x, x), this.matCanv)
	this.mHUD.name = "hud"
	if (sHUD) sHUD.add(this.mHUD)

	//// DEBUG (MITTIG) /////////////
	this.dbgOn = GET_ParD("hud", 0)
	this.mHUDlast = null


	//// F-P-S (rechts) /////////////////
	this.dFps = this.gFps = this.xFps = 25 // delta 100ms  glättungswert
	this.fpsA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] // Array
	this.fpsMin = GET_ParD("fps", 10) * 1
	this.fpsSec = 0

	var mat = new THREE.MeshLambertMaterial({ color: 0x000000, side: THREE.FrontSide })
	this.mHoe = new THREE.Mesh(new THREE.PlaneBufferGeometry(0.006, 2.3), mat)
	this.mHoe.name = "höhe"
	this.mHoe.position.x = cameraHUD.right * 0.998
	this.mHoe.position.y = cameraHUD.top * 1
	if (sHUD) sHUD.add(this.mHoe)



	//// SELECTOR-INIT ////////////////
	var infoSelect = null
	var neuSelect = null
	var altSelect = ""
	var altMaterial = null
	var mHUDast = null

	//// ENDE CONSTRUCTOR HUD (ausser das ganz unten noch was kommt) ////


	this.Resize = function () {
		with (this) {
			this.mHUD.position.y = +cameraHUD.top - 0.5
			this.mHUD.position.x = -cameraHUD.right + x / 2


			this.mCompass.position.x = cameraHUD.right * 0.98 - rad
			this.mCompass.position.y = cameraHUD.top * 0.98 - rad
			//log(cameraHUD.right , cameraHUD.top)
		}
	}


	//////////// U P D A T E ////////////////////////////////
	this.Update = function (dt, seconds, compass) {
		with (this) {

			//// KOMPAS ///
			this.mCompass.rotation.y = compass + g(180)
			this.mCompass.rotation.x = -camera.rotation.x

			// FPS ermitteln (und dt begrenzen)
			var fps = 1 / dt; if (fps > 99) fps = 99
			gFps = (gFps * 6 + fps) / 7
			xFps = (xFps * 99 + fps) / 100
			var max = 0.05 // s  Sekunden
			dFps += dt
			if (dFps < max) return
			dFps -= max
			/** /
					if(gFps>fpsMin+3) tileDistMax++
					if(gFps<fpsMin-3) tileDistMax--
			/**/

			//// Sichtweite als Stellgröße zur Regelung der Mindest-Framerate
			var dif = Math.abs(gFps - fpsMin); dif = dif * dif * dif / 1000 * dt + 1  // Je mehr Abweichung desto schneller die Änderung
			/**/
			var far = camera.far
			//r dif = dt/10 + 1
			if (gFps < fpsMin)
				far /= dif
			else
				far *= dif
			if (far > FAR)
				far = FAR
			camera.far = far	//	scene.fog  = new THREE.Fog( 0x887788, far*0.7, far ) // 0x00BFFF
			/**/	//// Sichtweite als Stellgröße zur Regelung der Mindest-Framerate

			this.mHoe.scale.y = 1.25 - Math.log10(camera.position.y) / 2.5

			/*** /
					if(skyDome!==undefined) {
						var scale = skyDome.scale.x
						if( gFps<fpsMin) scale /= dif
						else             scale *= dif
						if(scale>1.000) scale=1.000
						if(scale<0.001) scale=0.001
						skyDome.scale.x = scale
					//	skyDome.scale.y = scale
						skyDome.scale.z = scale
					}
			/***/

			fpsSec += dt
			if (fpsSec > 0.5) {
				fpsSec -= 0.5
			} else return



			//// Ab hier läuft nur alle xx ms bearbeiten: reduziert Auslastung! ////

			var factPy = Math.abs(camera.position.y); if (factPy < 1) factPy = 1
			var factPq = factPy = Math.sqrt(factPy)
			camera.near = factPq / 5

			//// DEBUG (update)
			if (this.dbgOn > 0) {
				var line1 = osmDo + "n " + Math.floor(seconds) + "s " + Math.floor(control.heading) + "°  lat:" + latitude
				var line2 = "dt:" + Math.floor(dt * 1000) + " fps: " + Math.floor(Fps) + "/" + Math.floor(0 + fps) + "  " +
					+ cameraHUD.right.toFixed(2) + "/" +
					+ cameraHUD.top.toFixed(2) + "/" +
					//	  + sceneContainer.offsetWidth.toFixed(0)  +"/"+
					//	  + sceneContainer.offsetHeight.toFixed(0) +"/"+
					camera.aspect.toFixed(2)
				var line3 = teststr + " " + camera.Lat().toFixed(4) + "/" + camera.Lon().toFixed(4)
				Out([line1, line2, line3])
			}//DEBUG

			else { // Auto.Point and show OBJ Texts:
				//Check(0,-0.3,true) // Etwas tiefer als die Mitte, nur wenn in der Nähe
				//if(!infoSelect) context.fillText(Math.floor(gFps)+"fps", 20, 20)
			}


		}
	} // hud.Update

	this.Height = function (dt) {
		with (this) {
			if (!altSelect) return
			altSelect.scale.y *= 1 + dt
		}
	}


	this.Fps = function () {
		with (this) {
			// * // F.P.S. ANZEIGE, wird nur zusätzlich zum Text eingeblendet
			if (gFps < fpsMin) {
				var x = canvas.width - 99
				var y = 10
				context.clearRect(x, y, 60, 28)
				context.fillStyle = "rgba(0,0,0,0.1)" // dunkel, gut durchsichtig
				context.fillRect(x, y, 60, 28)
				context.fillStyle = textColour
				context.fillText(Math.floor(gFps), x + 33, y + 21)

				for (var i = 0; i < 9; i++) {
					fpsA[i] = fpsA[i + 1]
					context.fillRect(x + 3 + i * 3, y + 22, 3, -fpsA[i + 1])
				}
				fpsA[9] = Math.sqrt(Math.floor(gFps)) * 2
				texture.needsUpdate = true	// canvas contents will be used for a texture
			}
		}
	}


	this.Check = function (x, y, close) {
		with (this) { //checkklick
			var mouse = new THREE.Vector2(x, y)

			raycaster.setFromCamera(mouse, camera) // nicht HUD!
			var intersects = raycaster.intersectObjects(scene.children, true)
			if ((intersects.length > 0)					// Es wurde übarhaupt was getroffen
				&& (intersects[0].object.osm !== altSelect)	// und das hat ein NEUES OSM-Object 'dran
			) {
				if ((intersects[0].distance > 2.0) && close) return // nicht nahe genug? Weiter altes anzeigen

				if (gCustom == 2) { // Wien
					//	window.open("index.html?login=1&lat="+lat+"&lon="+lon,"_parent")
					var osm = intersects[0].object.osm
					if (!osm) return
					if (houseID = osm.GetTag("GO-Note")) { // Fahne geklickt: Bekannter Kunde
						parent.house_clicked(houseID)
						return
					}

					if (houseID = osm.GetTag("building")) { // Fahne geklickt: Bekannter Kunde
						var node = nodes[osm.wayNodes[0]]
						parent.building_clicked(node.lat, node.lon)
						return
					}
					return
				}

				this.dbgOn = 0
				// *** Mash mit neuem OSM-Object getroffen! ***
				neuSelect = intersects[0].object
				altSelect.material = altMaterial

				altSelect = neuSelect
				altMaterial = neuSelect.material
				// log("Raycaster: ",neuSelect.id,neuSelect.tags,neuSelect.values)

				infoSelect = null // Nicht anzeigbar?
				ddmrSelected = null
				if (neuSelect.osm) infoSelect = neuSelect.osm
				else if (neuSelect.parent.osm) infoSelect = neuSelect.parent.osm
				else if (neuSelect.parent.parent)
					if (neuSelect.parent.parent.osm) infoSelect = neuSelect.parent.parent.osm
				if (infoSelect) {
					if (infoSelect.typeMain == "3dmr") {
						log("3dmr selected")
						ddmrSelected = neuSelect.parent.parent
					}

					altSelect.osm = infoSelect
					if (infoSelect.idWay && !(infoSelect.tags.length > 0)) infoSelect = ways[infoSelect.idWay]
					infoSelect = infoSelect.Info()
				}

			} else {
				// Kein Objekt getroffen
				if (close) return
				altSelect.material = altMaterial
				altSelect = ""
				infoSelect = null
				ddmrSelected = null
			}

			/// OSM-Tags von Mesh in Ausgabe (Check)
			if (infoSelect) {
				log("infoSelect: ", infoSelect.toString())
				neuSelect.material = mlm.hgruen;
				Out(infoSelect)
			} else
				Out()// Nur leeren

		}
	} // this.check


	this.Out = function (texte) {
		with (this) {
			context.clearRect(0, 0, canvas.width, canvas.height)
			if (texte) {
				var l = texte.length
				var w = 0
				for (var i = 0; i < l; i++) {
					var z = context.measureText(texte[i]).width
					if (w < z) w = z
				}

				var x = 3 // Position äää
				var y = 3
				context.fillStyle = "rgba(0,0,0,0.05)" 		// dunkel, gut durchsichtig  HINGERGRUND <====
				context.fillRect(x, y, w + x + x, l * (textPx * 5 / 4) + 8)  // 16*/5/4=20
				context.fillStyle = textColour
				for (var i = 0; i < l; i++)
					context.fillText(texte[i], x + 3, y + (textPx * 5 / 4) * (i + 1))
			}
			texture.needsUpdate = true	// canvas contents will be used for a texture
		}
	}


	this.Point = function (x, y) {
		if (y < 50) {
			if (x > window.innerWidth / 3) {
				window.open(httpx + "osmgo.org/info", "_blank"); log("Point-Start beim Kompas")
				return
			}

			else if (neuSelect) {
				log("OSM:", altSelect.osm)
				if (altSelect.osm)
					if (altSelect.osm.typeMain)
						if (altSelect.osm.typeMain == "_keep") {
							var schema = altSelect.osm.GetTag("_keep")
							var error = altSelect.osm.GetTag("K.R.  ID")
							var type = altSelect.osm.GetTag("Keepright")
							var osm_id = altSelect.osm.GetTag("OSM ID")
							if (type == "way") window.open(httpx + "www.openstreetmap.org/way/" + osm_id, "_blank")
							if (type == "node") window.open(httpx + "www.openstreetmap.org/node/" + osm_id, "_blank")
							if (type == "relation") window.open(httpx + "www.openstreetmap.org/relation/" + osm_id, "_blank")
							window.open(httpx + "keepright.at/report_map.php?schema=" + schema + "&error=" + error, "_blank")
							return
						} // keep

				if (!altSelect.osm) return
				var way = false
				if (altSelect.osm.wayNodes) way = true
				if (way)
					window.open(httpx + "www.openstreetmap.org/way/" + altSelect.osm.id, "_blank")
				else window.open(httpx + "www.openstreetmap.org/node/" + altSelect.osm.id, "_blank")
				return
			} // neuSelect
		} //y<

		var cx = (x / window.innerWidth) * 2 - 1 // Pixel in +/- 1 umrechen
		var cy = - (y / window.innerHeight) * 2 + 1
		this.Check(cx, cy, false)
	} // Point


	this.DbgOn = function (on) {
		this.dbgOn += on
		if (on == 0) if (this.dbgOn > 0) this.dbgOn = 0
		else this.dbgOn = 1
	}


	///// Noch einbischen Konstruktor!
	this.Resize() //  Aufruf geht erst nach der Deklaration!
}




//-----------------------------------------------------------------------------------
function writeLogLine(text) {
	if (myURL.charAt(0) == 'f') return // f=file
	if (!multiplay) return

	var xmlhttp = new XMLHttpRequest()
	xmlhttp.onreadystatechange = function () {
		if ((xmlhttp.readyState == 4) && (xmlhttp.status == 200)) {
			var ip = xmlhttp.response.split('.')
		}
	}
	xmlhttp.open("GET", "./log.php?" + text, true)
	xmlhttp.send()
}
//-----------------------------------------------------------------------------------
