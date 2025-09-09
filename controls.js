import * as THREE from 'three';
import {
	sceneContainer, gpsOn, camera, cameraHUD, touchable, osmBnode_id, inc_osmBnode_id, latitude, longitude, set_lalo, accuOld, set_accuOld,
	posX0, posY0, set_posY0, posZ0, log, inc_dbg, dbg, stereoOn, set_stereoOn, g, gCustom, DevOrConsOn, GET_Par, GET_ParD, r, gServer, fly,
	fovDefault, light, meshXQuaFly, skyDome, parMdl, animate, myURL, userName, viewLevel,
	lastLoadx, lastLoadz, lastLoadEx, lastLoadEz, mesh2Segway, control, diffLevel, simul, gOptimize, set_gOptimize, set_userSet,
	tileDistMax, scene, stereoEffect, mesh1Quatro, mesh3FlyCol, multiplay, avatars, httpx, hud, dbgID
} from './main.js';
import { chat3, chat2, chat1, chat0, replayI, gpsAct, set_gpsAct_pos } from './render.js'
import { Node } from './render_node.js'
import { tileLoading, set_tileLoading, osmBuilder, GetLon2x, GetLat2z } from './osm.js'
import { mLogo } from './hud.js';
import { MapillaryNearest } from './mapillary.js'
import { PanoramaxNearest } from './panoramax.js'

export var max_dt = 1 / 2  // mindestens 2 FPS - 1000 ms / x = ...ms

export var dir = 0
export var view = g(-10)

export var teststr = ""
export function set_teststr(str) { teststr = str }

export function SinCos(a, r) {
	if (!r) r = 1
	return [Math.sin(a) * r
		, Math.cos(a) * r
	];
}

export var ddmrSelected = null
export function set_ddmrSelected(v) { ddmrSelected = v }

var max_xz = false
var lastStamp = 0
var showX = 1

var lat0 = 0;
//r lon0 = 0;

// Für Tastatur
export var keyAlt = false
export var keyShift = false
var {
	keyEsc, keyCmd, keyCtrl, keyEnter, keySpace,
	keyPUp, keyPDown, keyUp, keyDown,
	keyLeft, keyRight,
	key_0, key_1, key_2, key_3, key_4,
	key_B, key_C, key_I, key_L, key_M, key_N, key_O, key_P, key_R, key_T, key_X, key_Z,
} = false

export function Phytagoras(a, b) { return Math.sqrt(a * a + b * b); }


export function sendMail() {
	var link = "mailto:karlos@osmgo.org" //+ "?cc=karlos@ac1000.de"
		+ "?subject=" + escape("OSM-go Test Report")
		+ "&body=Was it fun, ok or a disaster? Please send what you experienced"
	window.location.href = link;
}

function Integrator(ini) {
	if (!ini) ini = 0
	this.val = ini // actual integration value
}


Integrator.prototype.stop = function () {
	this.val = 0
}

Integrator.prototype.update = function (active, plus, minus, aUp, aMax, dt, aDown, tl) {
	/*with (this)*/ {

		/** /	if(tl)		log("::"+val+" - "+plus+" - "+minus+" - "+dt) //üüü		/**/

		// Siehe Text unten bei SpeedControl.prototype.update
		if (dt >= max_dt) aUp = 0

		if (!aDown) aDown = 0
		if (aMax == 0) aMax = 1e33 // Unlimited
		var slow = true
		var a = 0
		if (active) {
			//	if(plus)  { this.val += this.aUp*dt ;if(this.val> +this.aMax) val = +this.aMax ;slow=false }
			//	if(minus) { this.val -= this.aUp*dt ;if(this.val< -this.aMax) val = -this.aMax ;slow=false }

			if (plus) {
				if (this.val >= 0) a = aUp
				else a = aUp * 10
				this.val += a * dt
				if (this.val > +aMax) this.val = +aMax
				slow = false
			}

			if (minus) {
				if (this.val <= 0) a = aUp
				else a = aUp * 10
				this.val -= a * dt
				if (this.val < -aMax) this.val = -aMax
				slow = false
			}



		}//active

		if (slow) {
			if (aDown > 0) {
				var slowdt = aDown * dt
				if (Math.abs(this.val) < slowdt) this.val = 0
				else {
					if (this.val > 0) this.val -= slowdt
					else this.val += slowdt
				}
			}
			else {  // Stop in about 1 second (1000ms)
				var slowdt = this.val * 10 * dt  // 10=? 
				if (Math.abs(this.val) < Math.abs(slowdt)) this.val = 0
				else this.val -= slowdt
			}

		}

		return this.val * dt // acceleration per time
	}
}




function SpeedControl(aUp, aDown, aMax) { ///////////////// SPEED CONTROL //////////////////////////

	if (!aMax) aMax = 1e33 // unlimited
	if (!aDown) aDown = aUp	// symetric

	this.aMax = aMax
	this.aUp = aUp
	this.aDown = aDown

	this.val = 0 // actual integration value (usually a speed to be integrated to a position or angle)
	this.pass0 = 0
}


SpeedControl.prototype.slow = function (dt, aDownP) {
	/*with (this)*/ {
		if (dt >= max_dt) dt = max_dt
		var slowdt = aDownP * dt
		if (Math.abs(this.val) < slowdt) this.val = 0
		else {
			if (this.val > 0) this.val -= slowdt
			else this.val += slowdt
		}
	}
}

SpeedControl.prototype.update = function (active, plus, minus, dt) {
	/*with (this)*/ {

		/*
		Viele Häuser gibt langes Rendern, also großes dt. Tile laden ggf. auch.
		Tasten, die derweil geändert werden, kommen erst danach zur Wirkung!
		Inzwischen läuft der Hochlaufgeber samt Beschleunigung weiter, wenn man nichts tut!
		Aber was? Bei kleinen Zeitsprüngen ruckelt die Bewegung halt etwas, da kann man nichts machen.
		Die Beschleunigung sollte aber schon bald unterlassen werden (Bremsen nicht).
		Bei langer Zeit sollte aber auch die Bewegung "enden".
		Die Tasten hätte der User vielliecht/warscheinlich längst losgelassen, was man (zentral) simulieren kann.
		Und das Brensen in der Zeit des langen Zeitsprungs auch.
		*/
		//	if(dt>=max_dt) aUp = 0

		var autoSlow = true

		if (active) {
			var b = this.val
			var a = this.aUp * dt
			if (dt >= max_dt) a = 0

			if (plus) {
				autoSlow = false
				if (this.val < 0) a *= 4 // breaking? X as strong
				b = this.val + a
				if (b > +this.aMax) b = +this.aMax // maximum
			}

			else
				if (minus) {
					autoSlow = false
					if (this.val > 0) a *= 2
					b = this.val - a
					if (b < -this.aMax) b = -this.aMax // minimum
				}
				else this.pass0 = 0

			if (this.val != 0)
				if (Math.sign(this.val) != Math.sign(b))	// passing zero? wait for 0.5s
				{ this.pass0 = 0.3; this.val = 0 }

			if (this.pass0 > 0)
				this.pass0 -= dt
			else this.val = b

		}

		if (autoSlow) {
			if (this.aDown > 0 && !keyEsc) {
				var slowdt = this.aDown * dt
				if (Math.abs(this.val) < slowdt) this.val = 0
				else {
					if (this.val > 0) this.val -= slowdt
					else this.val += slowdt
				}
			}
			else {  // Stop in about 1 seconds
				var slowdt = this.val * 10 * dt
				this.val -= slowdt
			}

		}

		return this.val * dt // acceleration per time
	}
}







/////////////////////////////////////////////
/// KLASSE GO-Controler  ////////////////////
/////////////////////////////////////////////


/*


file:///Users/Ka rl/Dropbox/OSMgo/OSMgo.html?lat=49.7156034&lon=11.0871478
						 gps,osm,lat,lon:  -99 0 49.71563797738 11.0871478
												 49.71567255477 11.0871478

Konzept:
Aktoren wie Drehsensor werden vorsichtig, fehlersicher aktiviert und liefern ihre aktuellen Zustände event-mäßig oder zyklich an Controler-Variablen
Passoren, na ja, die Kammera, vielleicht auch die Map, sind steuerbar. Teils auch zyklisch über Controler-Variablen;
Die Kamera muss aber dirket gesteuert werden, da die "Standard-" Controls das auch tun. Hier gibt es (nur) Delta-Variablen,
die am Ende akkumulieren
Dazwichen sind beliebige aktivierbare Control-Logiken wie Karte schieben, Durch Häuser Laufen, Fliegen, ...

Der Controler muss nicht mehrfach instanzierbar sein. Brauchen wir ein "new" und "this"? Nur wenn wir "controler.methode" wollen,
also auch die Funktionen des Kontrolers in dessen Namespace verbergen. Wollen wir? Erst mal ja.

*/

//// Klassen-Lokale Variablen? /////////////////////////////////////////
var accuracy = 0


function goControl(webGLRenderer, camera) {

	if (dbg > 2) log("goControl INIT - Constructor")
	this.DOcontrols = new DeviceOrientationControls(camera)

	// this oder var oder nix? Wir brauchen nur eine Instanz, also kein this. Nix würde es ausserhalb des Namespaces sichtbar machen, also "var". Stimmt das alles???

	// Parameter abspeichern
	var camera = camera
	var webGLRenderer = webGLRenderer

	// Instanzvariable = Extern erreichbar machen
	this.screenOrientation = window.orientation || 0
	this.heading = 0 // Magnetisch
	this.wWidth = 0
	this.wHeight = 0
	this.wMin = 0
	this.wMax = 0
	this.PointVStart = 0;
	this.PointHStart = 0;


	//// Klassen-Lokale Variablen? /////////////////////////////////////////
	//var accuracy = 0

	// Kammera Blickrichtung horizontal - in RAD! Nur in URLs sind es GRAD. 0=Nord, gegen Uhrzeiger ansteingend bis PI*2 (360°)
	// Kammera Blickrichtung vertikal   - in RAD! Nur in URLs sind es GRAD. 0=Horizont <0 tiefer, >0 höher      bis PI/2  (90°)
	if (GET_Par("ele")) set_posY0((GET_Par("ele")) * 1) // *1 muss sein, sonst kommt das als String! ÄH ???
	if (GET_Par("dir")) dir = g(GET_Par("dir"))
	if (GET_Par("view")) view = g(GET_Par("view"))

	// 1=Inspect 2=SegWay   3=...
	this.controlMode = GET_ParD("con", 1)
	if (this.controlMode < 1) this.controlMode = 1
	if (gCustom == 2) this.controlMode = 2
	if (this.controlMode == 2) { set_posY0(1.6); view = 0 }

	var fovCam = 0
	// Mach mal XYZ in ein Vector3 !!???
	var posY = posY0
	var posX = 0, posZ = 0
	var adpX = 0, adpY = 0, adpZ = 0

	var rotX = view
	var rotY = dir
	var rotZ = 0

	var adrX = 0, adrY = 0, adrZ = 0
	var posR = 0, posF = 0
	var adpR = 0, adpF = 0

	var vCardF = 0
	var lCardY = 0 // last Kamera Y
	var eCardY = 0 // Everidge dY

	// Für Pointer (Maus&Touch)
	var PointF = false // First-Pointer aktiv: Erste Maus geklickt, 1-Finger-Touch berührt screen
	var PointS = false // Second
	var PointT = false // Third
	var PointV = 0;
	var PointDV // Positionen auf dem Bildschrim beim Bedienen
	var PointH = 0;
	var PointDH
	var PointD = 1; var PointDStart = 1 // 1!
	var PointGlobe = false
	var WheelD = 0;	 // Bewegung des Mausrads	
	var WheelX = 1.1;	 // Bewegung des Mausrads	

	// Werte der Kammear bei Point-Start
	var pStartX; var rStartX
	var pStartY; var rStartY
	var pStartZ; var rStartZ
	var lastCamY
	var DevOrConsOn = stereoOn // touchable // DeviceOrientationControls aktiv

	this.wWidth = sceneContainer.offsetWidth
	this.wHeight = sceneContainer.offsetWidth
	if (stereoOn == -1) if (touchable && this.wWidth > this.wHeight) (1); else set_stereoOn(0)
	//log("control-init "+this.wWidth+" "+this.wHeight+" stereoOn:"+stereoOn,touchable)

	if (stereoOn) {
		this.controlMode = 2 //
		posY = 1.6 // m
		set_posY0(posY)
		rotX = view = 0

		// Test-Instrument
		var geometry = new THREE.PlaneGeometry(5, 1)
		var material = new THREE.MeshLambertMaterial({ color: 0xff0000, side: THREE.DoubleSide })
		var testInst = new THREE.Mesh(geometry, material)
		testInst.position.z = -10
		scene.add(testInst);
	}

	/*** /
	if ((navigator.geolocation) && (gpsOn)) {  // Gibt es GPS? Nicht Notebook Zyklisch emfangen
		var s = "GPS watch Currend?: "
		if (navigator.geolocation.watchPosition) s += "w "
		if (navigator.geolocation.getCurrentPosition) s += "C "
		if (log > 0) log(s) // ;alert(s)
		if (navigator.geolocation.watchPosition)
			navigator.geolocation.watchPosition(getGeolocation)
		else navigator.geolocation.getCurrentPosition(getGeolocation)
	}
	else
	/***/
	{
		teststr = "no GPS"
		if (log > 2) log("--- no GPS - browser/device ---")
		lat0 = latitude  // 49.715603 //lon0 = longitude // 11.087147
		accuracy = 11
	}

	//	var acc  = 10  ;if(keyDown && intPosF.val>0) acc  = 25
	this.speedPosF = new SpeedControl(10, 0.1/*no max*/) // (aUp,aDown,aMax) 

	this.intPosF = new Integrator()
	this.intPosR = new Integrator()
	this.intPosY = new Integrator()

	this.intPo2F = new Integrator()
	this.intPo2Y = new Integrator()

	this.intRotX = new Integrator()
	this.intRotY = new Integrator()
	this.intRotZ = new Integrator()

	this.int3dmrDir = new Integrator()
	this.int3dmrLft = new Integrator()
	this.int3dmrBak = new Integrator()
	this.int3dmrEle = new Integrator()
	this.int3dmrSiz = new Integrator()


	this.kmt = 0	// Key,Mouse,Touch activity

	if (gCustom != 2) {
		this.Flight = new FlightObject()
	}
	//	this.Flight.init(fObj);
	//----------------------------------------------------

	//// Left notes
	var
		xmlhttpN = new XMLHttpRequest()
	xmlhttpN.onreadystatechange = function () {
		return; // tttn
		if ((xmlhttpN.readyState == 4) && (xmlhttpN.status == 200)) {
			var vs = xmlhttpN.response.split("<br>")
			for (var v in vs) {
				if (vs[v].length < 9) continue
				//log("Note:",vs[v])
				var vi = vs[v].split(";")
				//      0         1             2                3          4
				// $jetzt+userName+";"+camera.Lon()+";"+camera.Lat()+";"+text
				var node = new Node(osmBnode_id, vi[2], vi[3])
				node.AddTag("GO-Note", vi[4])
				node.AddTag("From", vi[1])
				inc_osmBnode_id()
				node.Place()
			}
		}
	}
	xmlhttpN.open("GET", "user/notes.txt", true)
	xmlhttpN.setRequestHeader('Cache-Control', 'no-cache');
	xmlhttpN.send()

	/// Ende Constructor //////////////////////////////////////////////////////////////////////////////
	/// Nicht ganz! Unten kommt noch ein Stück! Vieles geht erst, wenn die Mehtoden deklariert sind ///
	///////////////////////////////////////////////////////////////////////////////////////////////////



	//// Da diese Methoden IN der Klasse stehen sollten sie eingerückt sein, sind sie aber nicht, ausnamsweise	
	this.Fullscreen = function () {
		/*with (this)*/ {
			if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen()
			else if (sceneContainer.requestFullscreen) sceneContainer.requestFullscreen()
			else if (sceneContainer.msRequestFullscreen) sceneContainer.msRequestFullscreen()
			else if (sceneContainer.mozRequestFullScreen) sceneContainer.mozRequestFullScreen()

			//var lockedAllowed = window.screen.lockOrientation("portrait-primary");  alert(lockedAllowed)
		}
	}

	this.onWindowResize = function () {
		/*with (this)*/ {
			this.wWidth = sceneContainer.offsetWidth
			this.wHeight = sceneContainer.offsetHeight
			camera.aspect = this.wWidth / this.wHeight  // >1 wenn Quer
			camera.updateProjectionMatrix()

			// Die längere Seite wird = 1
			var I = 1
			if (navigator.platform == "iPhone") I = 0.7

			if (!stereoOn) {
				this.wMin = this.wHeight
				this.wMax = this.wWidth
				if (this.wWidth < this.wHeight) {	// |Hochkant|
					this.wMin = this.wWidth
					this.wMax = this.wHeight
					cameraHUD.top = I
					cameraHUD.right = I * camera.aspect	// <1 = 0.x
				} else {				// <== Quer ==>
					cameraHUD.right = I
					cameraHUD.top = I / camera.aspect	// >1 = 1.x
				}
				cameraHUD.left = -cameraHUD.right
				cameraHUD.bottom = -cameraHUD.top
				cameraHUD.updateProjectionMatrix()
			}


			var p = navigator.platform
			var r = 2
			//	if( p=="iPhone" && this.wWidth<this.wHeight) r = 3.3	// hochkant   iPhone 980 1461 Quer:  980 h:551
			//	if( p=="iPad"   && this.wWidth<this.wHeight) r = 2.5

			if (hud) hud.Resize()

			if (stereoOn) stereoEffect.setSize(this.wWidth, this.wHeight)
			else webGLRenderer.setSize(this.wWidth, this.wHeight)
		}
	}

	this.onScreenOrientation = function () {
		/*with (this)*/ {
			this.screenOrientation = window.orientation || 0;
			this.Fullscreen()
		}
	}



	//// Hilfsfunktionen /////////////////////////////////




	this.Stop = function () {
		keyAlt = keyShift = keyUp = keyDown = keyPUp = keyPDown = keyRight = keyLeft = keyEnter = keySpace = false
	}

	this.Reset = function (home) {
		/*with (this)*/ {
			this.Stop()
			vCardF = 0

			camera.fov = fovDefault
			DevOrConsOn = stereoOn // touchable

			this.intPosF.stop()
			this.intRotX.stop()
			this.intRotY.stop()
			this.intRotZ.stop()

			if (home) {
				camera.position.set(posX0, posY0, posZ0)
				camera.rotation.set(view, dir, 0)
			}
		}
	}


	// Das ist hier nur Flickwerk!  ToDo???
	// VR-Anteile des 2D-Vektor in XZ-Anteile aufteilen 
	this.WalkPosi = function (forward, right) {
		var a = camera.rotation.y
		posX = pStartX
			+ Math.sin(a) * forward
			+ Math.cos(a) * right
		posZ = pStartZ
			+ Math.sin(a) * -right
			+ Math.cos(a) * forward
	}

	this.WalkPosAd = function (forward, right) {
		var a = camera.rotation.y
		adpX += (Math.sin(a) * forward
			+ Math.cos(a) * right)
		adpZ += (Math.sin(a) * -right
			+ Math.cos(a) * forward)
	}




	var clockControl = new THREE.Clock()

	////// update Zyklisch
	this.update = function (dt) {
		/*with (this)*/ {
			if (dbg > 9) log("goControl update START")

			var dt = clockControl.getDelta() + 0.000001


			lastCamY = camera.position.y

			if (dt > 40 * max_dt) {
				this.Stop();
				log("-------- max_dt*4: " + dt)
				dt = max_dt
			}

			/*
				if( dt>max_dt) {	// Wenn Javascript mal wieder ein Päuschen macht,
					dt=max_dt		//  soll das riesen dt nicht alles wild toben lassen. Also alles begrenzen:
				}
			*/

			var b = 0
			var aSoll = 0
			var vSoll = 0
			if (DevOrConsOn) {
				this.DOcontrols.update()
				if (this.screenOrientation == 0) { b = g(-90 - 5) + this.DOcontrols.beta }	// vertical
				else { b = g(+90 - 5) - this.DOcontrols.gamma; if (b > Math.PI / 2) b -= Math.PI }	// horizontal
				//	alert(this.screenOrientation+" "+b+" "+this.DOcontrols.beta)

				var aa = this.DOcontrols.alpha - this.DOcontrols.alphaOffsetAngle	// Gerätebezogen ab Start original alpha 0-360 wobei der Wert immer um 0 schwanken sollte
				if (this.DOcontrols.gamma > 0) aa -= g(180)
				if (aa > g(+180)) aa -= g(360) // aus  350 werden -10
				if (aa < g(-180)) aa += g(360)	// aus -270 werden +90
				var ax = Math.abs(aa) - g(10)	// Zu viel verdreht?
				if (ax > 0) {
					this.DOcontrols.alphaOffsetAngle += (ax * Math.sign(aa) * dt * 1) // Segway langsam nachdrehen
					//	alert(r(this.DOcontrols.alpha)+" / "+r(this.DOcontrols.alphaOffsetAngle)+" / "+r(aa)+" / "+r(ax) )
					//	alert(r(this.DOcontrols.alpha)+" / "+r(this.DOcontrols.beta)+" / "+r(this.DOcontrols.gamma)+" / "+r(ax) )
				}
			}

			//?? was war das?? if(this.controlMode == 3) {		b = camera.rotation.x	}



			//b=0//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
			if (b != 0) {		// View ahead up/down
				var bx = Math.abs(b) - g(10)	// Zu viel verdreht?
				if (bx > 0)
					b = bx * Math.sign(b) // Segway langsam nachdrehen

				/*	Wie reagiert ein Segway? 
					Stillstand leichter: Winkel*Winkel => V-Soll (limitiert)
					Delta V-Soll/ist => Beschleunigung (limitiert!!) */
				vSoll = Math.min(b * b * 200, 10) * Math.sign(b); if (vSoll > 0) vSoll /= 10 // backward solwer
				aSoll = Math.min(Math.max(vSoll - vCardF, -20), +20)
				vCardF += (aSoll * dt)
				adpF = vCardF * dt
				adpR = 0
			}
			vCardF *= (1 - dt / 10) // Luftwiederstand und Reibung bremsen
			if (keyLeft || keyRight) vCardF *= (1 - dt * 5) // Kurve bremst
			if (keyEsc) {
				vCardF *= (1 - dt * 10) // Notbremse
				if (hud) hud.Out()	 // clear hud
				this.Stop() // keyAlt = keyShift = keyUp = keyDown = keyPUp = keyPDown = keyRight = keyLeft = keyEnter = keySpace = false
				if (hud) hud.Out([chat3, chat2, chat1, chat0])
			}
			/*		var rMax = 5
					if(camera.rotation.x < -g(rMax) ) camera.rotation.x = -g(rMax)
					if(camera.rotation.x > +g(rMax) ) camera.rotation.x = +g(rMax)  */

			/* Beim Unsehen soll angehalten werden. A) jede Drehung reduziert die Geschwindigkeit 
				B) Unruhe reduziert vSoll. Unruhe ist dY über die Zeit gemittelt  */
			var dY = Math.abs(camera.rotation.y - lCardY) / dt
			lCardY = camera.rotation.y
			eCardY = (eCardY * 10 + dY) / 11 // everidge
			vCardF *= Math.max(1 - dY * 1, 0) // Kurve bremst

			teststr = /*r(b)*/ dY.toFixed(2) + ":r a:" + aSoll.toFixed(2) + " v:" + vSoll.toFixed(2) + " i:" + vCardF.toFixed(2) + " s:" + adpF.toFixed(2)


			if (key_B) {
				key_B = false
				tileLoading.state = 1// Load again
				set_tileLoading(false)
				osmBuilder.LoadOsmTiles() // check for more to load
			}

			// Aktuelle Kamera-Werte lesen, neue addieren, scheiben

			var factPy = Math.abs(camera.position.y) / 2; if (factPy < 1) factPy = 1
			var factPq = factPy = Math.sqrt(factPy) * showX
			var AltShift = (keyAlt || keyShift || PointGlobe) && (ddmrSelected == null)
			var AltShifN = !(keyAlt || keyShift || PointGlobe) && (ddmrSelected == null)
			var Anyway = (ddmrSelected == null)



			// Key: Einfache Lineare Bewegung  ////////////////////  ALT ????
			// Das ist einie "relative" Steuerung: Die Position wird nicht gesetzt sondern eigendlich nur verändert
			// Drag/Touch addieren aber (nur) für eine Weile, müssen also einen Start-/Absolutert kennen.
			// Control-Init: Cam-Pos in Controler-Pos als Startwert kopieren. zyklisch Start+Delta in Cam
			// Oder bei D/T-Start Anfang merken und Deltas errechenen
			// Oder DOC ließt auch aus Start-/Eigen-Wert? NEIN!

			/*
			Verschiedene Modi: 1st-Person, 
			Es gibt immer 6 Bedienungen: XYZ * spin+shift. Und da soll ein Zoom sein! Lieber das "unsinnige" spinZ weglassen
			
			Hier meint + Pfeikreuz  -| Pfeilpaare	# Enter&Space bzw Wheel
		
			OSM Buildings:		Tastatur					Maus & Wheel		Touch						Kardboard
			 no key    Spin:	+ XY, Z:on					+ XY, Z mit Wheel?	1touch+ XY, Z entfällt		Orientation-Control
			 keyShift  Shift:	+ XY, Z mit #Enter/Space	+ XY, Z mit Wheel!	2touch+ XY, Z mit Abstand 	? Auto-Z? SegWay? flieger? quadrocopter?
		
			1st-Person:			Tastatur					Maus & Wheel		Touch						Kardboard
			no key		Walk    -Yspin  |Zshift  #Xspin?	wie Key				Wie OSMB?					
			keyShift    Fly     -Xshift |Yshift  Zspin:no					
			
			
			*/




			if ((this.controlMode == 1) && (!DevOrConsOn)) { // 1=Inspect  2=SegWay   3=...
				// Position aus FR wird XZ. Dazu Y  (Forward,Right - X=Quer Z=Vorrück  Y=Höhe)
				var fSlow = 2
				adpF = this.intPosF.update(AltShifN, keyDown, keyUp, 50, 0, dt) * factPq
				adpR = this.intPosR.update(AltShifN, keyRight, keyLeft, 50, 0, dt) * factPy //üüü

				/*		if(adpR>10)
							log("adpR> #################")
				*/

				adpY += this.intPosY.update(AltShift, keyEnter, keySpace, 100, 0, dt) * factPy
				adpY += this.intPosY.update(Anyway, keyPUp, keyPDown, 100, 0, dt) * factPy

				adpY += this.intPo2Y.update(AltShifN, keySpace, keyEnter, 50, 0, dt) * factPy * -Math.sin(camera.rotation.x)
				adpF += this.intPo2F.update(AltShifN, keySpace, keyEnter, 50, 0, dt) * factPy * +Math.cos(camera.rotation.x)

				//    Rotation	X/Y   Extra key, upKey,     downKey,  aUp,aMax
				adrY = this.intRotY.update(AltShift, keyLeft, keyRight, 5, 2, dt, 5 * 5) * camera.fov / fovDefault
				adrX = this.intRotX.update(AltShift, keyUp, keyDown, 5, 2, dt, 5 * 5) * camera.fov / fovDefault

				//            .update( active,   plus,        minus,  aUp,aMax,dt,aDown) { with(this) {

				if (ddmrSelected != null) {

					var ddmrPosition = ddmrSelected.children[0].position
					var s = 1 / ddmrSelected.info.scale
					ddmrPosition.x -= this.int3dmrLft.update(keyShift, keyLeft, keyRight, 5, 4, dt) * s
					ddmrPosition.y += this.int3dmrEle.update(true, keyPUp, keyPDown, 5, 4, dt) * s
					ddmrPosition.z -= this.int3dmrBak.update(keyShift, keyUp, keyDown, 5, 4, dt) * s
					ddmrSelected.rotation.y += this.int3dmrDir.update(!keyShift, keyLeft, keyRight, 5, 4, dt) * 0.1
					ddmrSelected.scale.x *= 1 + this.int3dmrSiz.update(!keyShift, keyUp, keyDown, 0.5, 4, dt)
					ddmrSelected.scale.y = ddmrSelected.scale.z = ddmrSelected.scale.x

					if (key_0 || key_O) {
						ddmrPosition.x = ddmrSelected.info.translation[0]
						ddmrPosition.z = ddmrSelected.infonslation[1]
						ddmrPosition.y = ddmrSelected.infonslation[2]
						ddmrSelected.scale.x = ddmrSelected.scale.y = ddmrSelected.scale.z = ddmrSelected.info.scale
						ddmrSelected.rotation.y = g(- ddmrSelected.osm.GetTag("direction", 0) - ddmrSelected.info.rotation)
					}

					if (ddmrSelected.rotation.y > g(360)) ddmrSelected.rotation.y -= g(360)
					if (ddmrSelected.rotation.y < g(0)) ddmrSelected.rotation.y += g(360)

					hud.Out(["ACTUAL:"
						, "direction and scale: "
						+ Math.floor((360 - r(ddmrSelected.rotation.y)) * 10) / 10 + " & "
						+ Math.floor(ddmrSelected.scale.x * 10000) / 10000   // Maßstab
						, "origin: [right,back,up]: "
						+ Math.floor(ddmrPosition.x * 100) / 100 + ", " // Rechts
						+ Math.floor(ddmrPosition.z * 100) / 100 + ", "	// Zurück			
						+ Math.floor(ddmrPosition.y * 100) / 100  		// Höhe

						, "TAGS/REPOSITORY - 3dmr.eu/model/" + ddmrSelected.info.id
						, "direction-tag/rotation & scale: "
						+ ddmrSelected.osm.GetTag("direction", "NoTag") + "/"
						+ ddmrSelected.info.rotation + " & "
						+ ddmrSelected.info.scale
						, "orgin [right,back,up] "
						+ ddmrSelected.info.translation[0] + ", "
						+ ddmrSelected.info.translation[1] + ", "
						+ ddmrSelected.info.translation[2]
					]
					)

					/** /
					
								if(keyPUp || keyPDown) {
									 hud.Out(
										[
										"3dmr model: Test elevation",
										"Actual elevation: "+ Math.floor(ddmrPosition.y*100)/100,  // Höhe
										"Repository orgin/translation r,b,e: " + ddmrSelected.info3dmr.translation[0] + ","+ ddmrSelected.info3dmr.translation[1] + ","+ ddmrSelected.info3dmr.translation[2]
										]
									)//out
								}  // key PupDown
					
								if(!keyShift) {
								
									if(keyLeft || keyRight) {
										if( ddmrSelected.rotation.y > g(360) ) ddmrSelected.rotation.y -=g(360)
										if( ddmrSelected.rotation.y < g(  0) ) ddmrSelected.rotation.y +=g(360)
										var dir = ddmrSelected.osm.GetTag("direction","-")
										hud.Out(
											[
											"3dmr model: Test compas directon",
											"Actual direction: "+ Math.floor( (360-r(ddmrSelected.rotation.y))*10)/10,
											"Tag direction: " + dir,
											"Repository rotation: " + ddmrSelected.info3dmr.rotation
											]
										)//out
									}  // key L/R
								
									if(keyUp || keyDown) {
										 hud.Out(
											[
											"3dmr model: Test scale (/)size)",
											"Actual scale: "+ Math.floor(ddmrSelected.scale.x*10000)/10000,  // Maßstab
											"Repository scale: " + ddmrSelected.info3dmr.scale
											]
										)//out
									}  // key u/d
									
								} //  NOshilft
								
								if(keyShift) {
								
									var aNNx = Math.floor(ddmrPosition.x*100)/100 +" , "+  // Rechts
											 + Math.floor(ddmrPosition.z*100)/100 +" , "+  // Zurück			
											 + Math.floor(ddmrPosition.y*100)/100  		   // Höhe
								
									if(keyUp || keyDown) {
										hud.Out(
											[
											"3dmr model: Test shift forward/back",
											"Actual shift: "+ aNNx,
											"Repository orgin/translation r,b,e: " + ddmrSelected.info3dmr.translation[0] + ","+ ddmrSelected.info3dmr.translation[1] + ","+ ddmrSelected.info3dmr.translation[2]
											]
										)//out
									}  // key V/B
									
									if(keyLeft || keyRight) {
										hud.Out(
											[
											"3dmr model: Test shift right/left",
											"Actual shift: "+ aNNx,
											"Repository orgin/translation r,b,e: " + ddmrSelected.info3dmr.translation[0] + ","+ ddmrSelected.info3dmr.translation[1] + ","+ ddmrSelected.info3dmr.translation[2]
											]
										)//out
									}  // key L/R
								}//shift
					
					/**/

				} // selected

			}// mode 1






			if ((this.controlMode == 2) && (!DevOrConsOn)) { // 1=Inspect   2=SegWay   3=...  sss sss sss
				// Position aus FR wird XZ. Dazu Y  (Forward,Right - X=Quer Z=Vorrück  Y=Höhe)
				//	var slow = 0.1 ;if(keyEsc)  slow = 0 ;
				if (keyLeft || keyRight) this.speedPosF.slow(dt, 10)
				adpF = this.speedPosF.update(!keyShift, keyDown, keyUp, dt) * factPq
				adpR = this.intPosR.update(keyShift, keyRight, keyLeft, 10, 0, dt) * factPy
				adpY += this.intPosY.update(keyShift, keyUp, keyDown, 10, 0, dt) * factPy
				adpY += this.intPosY.update(true, keyPUp, keyPDown, 50, 0, dt) * 2

				//    Rotation	X/Y   Extra key, upKey,       upKey,  aUp,aMax
				adrY = this.intRotY.update(!keyShift, keyLeft, keyRight, 5, 4, dt) * camera.fov / fovDefault
				adrX = this.intRotX.update(!keyShift, keySpace, keyEnter, 5, 4, dt) * camera.fov / fovDefault    // früher: Shift Up/Down
				//rZ = intRotZ.update( keyShift, keyEnter, keySpace,    5, 4, dt) // Lieber nicht und dafür Zoom:

				if (camera.position.y > 1.6) { // Jetpack
					adpY -= 9.8 * dt
					adpR = -adrY * 5
					adrY /= 5

					camera.rotation.z = adrY * 4
					camera.rotation.x = (camera.rotation.x * 9 + adpF) / 14
				}



			}


			if ((this.controlMode == 3) && (!DevOrConsOn)) { // 1=Inspect   2=SegWay   3=Plane


				var accDest_, rotDest_
				var difX = 0
				var difY = 0
				var sSpeed = 0

				if (keyLeft) difX = +900
				if (keyRight) difX = -900
				if (keyUp) difY = -10000
				if (keyDown) difY = +10000
				if (keyPUp)
					sSpeed = +1
				if (keyPDown)
					sSpeed = -1

				if (PointF) {
					var fakt = 500
					difX += -PointDH / this.wMin * fakt
					difY += +PointDV / this.wMin * fakt
				}

				accDest_ = -difY * 0.01; // Beschleunigung je nach y-Auslenkung  fff
				rotDest_ = -difX * 0.1;   // Drehung je nach x-Auslenkung

				if (gCustom != 2) {
					this.Flight.cycle(dt * 1000/*CYC_MOVE*/, rotDest_, accDest_, sSpeed, 0/*gd.yBoden*/);
					var obj = this.Flight.fObj();
					var wi = +obj.rotation.y
					var wx = -obj.rotation.x
					var cd = 22
					var hh = 7

					if (fly == "delorean") {
						cd = 5
						hh = 2
					}

					camera.position.copy(obj.position)
					camera.position.y += cd / 2 * Math.sin(wx) + hh // m höher
					camera.position.x += cd * Math.sin(wi)
					camera.position.z += cd * Math.cos(wi) // m zurück / dahinter
					camera.position.z += cd / 8 * Math.sin(wi)
					camera.position.x += cd / 8 * Math.cos(wi) // m seitwärts
					camera.rotation.x = obj.rotation.x - g(10)
					camera.rotation.y = obj.rotation.y
					camera.rotation.z = obj.rotation.z

				}
			}


			/** Was war das ??
			if((this.controlMode==3) && (!DevOrConsOn)) {
				adrY = intRotY.update(!keyShift, keyLeft,  keyRight,    5, 8, dt) * camera.fov/fovDefault
				adrX = intRotX.update(!keyShift, keyDown,  keyUp,       5, 8, dt) * camera.fov/fovDefault
			}  **/

			this.WalkPosAd(adpF, adpR)  // Inspect+Segway


			fovCam = this.intRotZ.update(true, key_Z && !keyShift,
				key_Z && keyShift, 10, 0, dt)

			camera.fov -= fovCam // zoom
			if (camera.fov > 120) camera.fov = 120
			if (camera.fov < 0.01) camera.fov = 0.01  	//log(camera.fov)

			//	if(stereoOn && !keyShift) adpF += -100*dt/2  // EXPERIMENT ONLY!: Kardboard auto walk




			if (this.controlMode == 1) { // 1=Inspect    2=SegWay   3=...		

				// Maus/Touch: XY-Twist 1:1 Bewegung  ////////////////////
				var fakt = 160
				if (PointF) {
					if (AltShift) {                   // dreh  RechtsLinksRaufRunter
						rotX = +PointDV / this.wMin * 2 + rStartX
						rotY = +PointDH / this.wMin * 2 + rStartY
					} else {	 // Identisch mit XX unten?? // shift RechtsLinksRaufRunter
						posR = -PointDH / this.wMin * fakt / 5 * (factPy / 3) // Laufen schneller je weiter oben
						posF = -PointDV / this.wMin * fakt / 5 * (factPy / 3)
						this.WalkPosi(posF, posR)
					}
				}

				if (PointS) { // 2-Finger Touch oder 2. Maus
					// Identisch mit XX oben?? //
					rotX = +PointDV / this.wMin * 2 + rStartX
					rotY = +PointDH / this.wMin * 2 + rStartY
				}

				// ?? Und WIE  shilftVorRück? Mit Spreiz. DoDo

				if (WheelD != 0) {
					//	if(dbg>1) log("WheelD",WheelD)
					if (AltShift) {
						adpY += WheelD * WheelX * factPy
					} else {
						adpY += WheelD * WheelX * factPy * Math.sin(camera.rotation.x)
						this.WalkPosAd(-WheelD * 1 * factPy * Math.cos(camera.rotation.x), 0)
					}
				}
				if (PointS) {
					adpY -= ((PointDStart / PointD - 1) * 5 * Math.sin(camera.rotation.x))
					this.WalkPosAd((PointDStart / PointD - 1) * 5, 0)		//	vorwärts/r
				}

				if (PointT) {
					posY = pStartY + PointDV / this.wMin * fakt// * (factPy/3)
					posR = -PointDH / this.wMin * fakt// * (factPy/3)
					this.WalkPosi(0, posR)
				}

			} // Inspect
			//log(keyAlt,keyShift)


			if (this.controlMode == 2) { // 1=Inspect    2=SegWay   3=...		
				//	log(PointDH,posF,pStartX,posX)

				// Maus/Touch: NOCH als Einfache 1:1 Bewegung  ////////////////////
				// Aktuelle Veränderung dazu rechen
				var fakt = 50
				if (PointF) {
					if (!keyShift) { //  shiftVorRück & drehRechtsLinks
						posR = -PointDH / this.wMin * fakt / 10 // ! Zusätzlich zum Rotieren auch ein bischen shiften
						posF = -PointDV / this.wMin * fakt / 2 * (factPy / 1.5) // Laufen schneller je weiter oben
						this.WalkPosi(posF, posR)
						rotY = +PointDH / this.wMin * 2 + rStartY
					} else { // Identisch mit XX unten //   drehRaufRuner & shiftRechtLinks
						rotX = +PointDV / this.wMin * 2 + rStartX
						posR = -PointDH / this.wMin * fakt
						this.WalkPosi(0, posR)
					}
				}// "erster" Zeiger

				if (PointS) { // 2-Finger Touch = 1 Finger+Shift
					// Identisch mit XX oben //   
					rotX = +PointDV / this.wMin * 2 + rStartX
					posR = -PointDH / this.wMin * fakt
					this.WalkPosi(0, posR)
				}

				if (WheelD != 0) {
					adpY += WheelD * WheelX * factPy
				}

			} // SegWay


			if (key_P) {
				key_P = false
				if (keyShift) {
					MapillaryNearest(camera.Lat(), camera.Lon())
				} else {
					PanoramaxNearest(camera.Lat(), camera.Lon())
				}
			}

			if (key_R) {
				key_R = false
				if (!keyShift && !keyAlt && !keyCtrl && !keyCmd) {
					alert("Send Test Report?")
					sendMail()
				}
			}

			if (key_0 || key_O) this.Reset(true) // home
			if (key_X && hud) {
				key_X = false
				this.controlMode++; if (this.controlMode > 3) this.controlMode = 1
				if (mesh2Segway)
					mesh2Segway.visible = (this.controlMode == 2)
				mesh1Quatro.visible = (this.controlMode == 1)
				mesh3FlyCol.visible = (this.controlMode == 3)
				camera.rotation.z = 0
				switch (this.controlMode) {	//        dddd
					case 1: hud.Out(["### Controls in VIEW-Mode",
						"ARROW-KEYS or WASD: slide +SHIFT: turn",
						"ENTER/SPACE: distance, +SHIFT: elevate",
						"",
						"MOUSE 1st: side, 2nd: turn, wheel: distance"])
						break

					case 2: hud.Out(["+++Controls in AVATAR-Mode",
						"ARROW-KEYS: left/right-turn, ahead/back",
						"ARROW-KEYS+SHift: elevate, shift right/left",
						"ENTER/SPACE: look up/down",
						"",
						"MOUSE: 1st like keys",
						"MOUSE: 2nd: look up/down, slide right/left"])
						//posY0 = 1.6 ;view = 0
						camera.position.y = 1.6
						camera.rotation.x = 0
						break

					case 3: hud.Out(["+++Controls in PLANE-Mode",
						"Will take of and land by speed atomaticly",
						"ARROW-KEYS: left/right-turn, ahead/back",
						"",
						"MOUSE/TOUCH: yes, try it!"])
						break
					default: hud.Out(["+++Controls ILLEGAL-Mode!!!"])
				}
			}


			//r cx = r(camera.rotation.x);	posY = -cx*4   // Blickwinkel abhängig von Höhe WEG

			if (replayI < 0) {

				if (posX != 0) camera.position.x = posX
				if (posY != 0) camera.position.y = posY
				if (posZ != 0) camera.position.z = posZ

				if (rotX != 0) camera.rotation.x = rotX
				if (rotY != 0) camera.rotation.y = rotY
				if (rotZ != 0) camera.rotation.z = rotZ

				camera.rotation.x += adrX; camera.position.x += adpX; pStartX += adpX
				camera.rotation.y += adrY; camera.position.y += adpY; pStartY += adpY	//	log("33333",camera.position.y,adpY)
				camera.rotation.z += adrZ; camera.position.z += adpZ; pStartZ += adpZ

				var y = +1 //  Erst mal nicht unterirdisch !!!! -100


				if ((camera.position.y <= 0) && (lastCamY > 0) && (this.controlMode < 3)) {
					alert("Do you realy want to go under ground? Use key 'Page-Up' do go up")
					keyCtrl = keyAlt = keyShift = keyCmd = keyDown = keyPDown = false
				}

				// Beim Segway: Augehnhöhe anstreben
				var y = camera.position.y - 1.5 // 1.6
				if (Math.abs(y) < 1.0) camera.position.y -= y * 1 * dt

				light.target.position.x = camera.position.x
				light.target.position.z = camera.position.z


				if (camera.rotation.y > g(360)) camera.rotation.y -= g(360)
				if (camera.rotation.y < g(0)) camera.rotation.y += g(360)

				var rMax = 89
				if (camera.rotation.x < -g(rMax)) camera.rotation.x = -g(rMax)
				if (camera.rotation.x > +g(rMax)) camera.rotation.x = +g(rMax)

				// Kammera- auf/ab-Neigung veringern auf <x Grad

				if (!keyUp && !keyDown && !keyEnter && !keySpace && dbg != 1.5) {
					if (camera.rotation.x > g(+30) && camera.position.y > 0)
						camera.rotation.x *= (1 - 0.95 * dt * (Math.abs(camera.rotation.x) - g(30)))
					if (camera.rotation.x < g(-30) && camera.position.y < 0)
						camera.rotation.x *= (1 - 0.95 * dt * (Math.abs(camera.rotation.x) - g(30)))
				}


				if (this.controlMode == 1) {
					var wi = camera.rotation.y
					var cd = 20

					meshXQuaFly.position.copy(camera.position)
					meshXQuaFly.position.y -= 8 // m tiefer
					meshXQuaFly.position.x -= cd * Math.sin(wi)
					meshXQuaFly.position.z -= cd * Math.cos(wi) // m zurück / dahinter
					meshXQuaFly.rotation.y = 1.1 * wi
				}



			}//kein replay


			if (skyDome) skyDome.position.set(camera.position.x, 0, camera.position.z)

			//   x ist "normal"								    z: Grad PLUS = Meter MINUS !! "In den Hintergrund"
			if (Math.abs(camera.position.x < (lastLoadx)) || Math.abs(camera.position.z > (lastLoadz))
				|| Math.abs(camera.position.x > (lastLoadEx)) || Math.abs(camera.position.z < (lastLoadEz))
				|| key_M
			) {
		/*if(!DevOrConsOn)??*/ {

					var lon = camera.Lon()
					var lat = camera.Lat()

					if (key_M && !keyShift) { // SLIPPY-MAP
						//	var url = myURL+"/OSMgoSlippy.html?lat="+lat.toFixed(5)+"&lon="+lon.toFixed(5)
						var url = myURL + "/map?go=1&lat=" + lat.toFixed(8) + "&lon=" + lon.toFixed(8) + "&user=" + userName
						if (stereoOn) url += "&card=" + stereoOn
						if (multiplay) url += "&multi=1"
						if (dbg > 1) log("Map-url: ", url)
						window.open(url, "_self")
						key_M = false // do avoid repetation
						return
					}

					if (key_M && keyShift) {  // Reload default or with shift only 0
						// "Pausen"-Logo vor 3D-Weld
						if (dbg == 1.5) set_gOptimize(0)
						if (mLogo) mLogo.visilble = true
						var dir = r(camera.rotation.y)
						var view = r(camera.rotation.x)
						var url = myURL + window.location.pathname + "?km=1" + "&lat=" + lat.toFixed(8) // pathname:
							+ "&lon=" + lon.toFixed(8)
							+ "&ele=" + camera.position.y.toFixed(2)
							+ "&dir=" + dir.toFixed(0)
							+ "&view=" + view.toFixed(0)
							+ "&user=" + userName
							+ "&dbg=" + dbg
						  /*if(this.controlMode>1)*/	url += "&con=" + this.controlMode
						if (hud.fpsMin != 10) url += "&fps=" + hud.fpsMin
						if (stereoOn) url += "&card=" + stereoOn
						if (simul) url += "&sim=" + simul
						if (gCustom) url += "&cu=" + gCustom
						if (gServer > 1) url += "&ser=" + gServer
						if (parMdl != 99) url += "&mdl=" + parMdl
						if (viewLevel != 17) url += "&vil=" + viewLevel
						if (diffLevel != 1) url += "&dil=" + diffLevel
						if (fly != 4) url += "&fly=" + fly
						if (fovDefault != 40) url += "&zoom=" + fovDefault / 40
						if (dbgID) url += "&id=" + dbgID

						if (keyAlt) {
							set_gOptimize(0)
							if (tileDistMax == 0) url += "&tiles=3"
							else url += "&tiles=1"
						}
						else url += "&tiles=" + tileDistMax
						url += ("&opt=" + gOptimize)
						if (dbg > 1) log("Reload-url: ", url)
						window.open(url, "_self")
						key_M = false // do avoid repetation
						return
					}

					osmBuilder.QueryOsmTiles(lon, lat)

				}//DevOrConsOn
			}//key_M

			if (camera.position.y > 500 && dbg != 1.5)
				camera.position.y = 500

			posX = rotX = adpX = adrX = 0; WheelD = 0
			posY = rotY = adpY = adrY = 0
			posZ = rotZ = adpZ = adrZ = 0

			if (mesh2Segway != null) {
				var sc = SinCos(camera.rotation.y - g(90), 0.15)
				var s2 = SinCos(camera.rotation.y - g(180), 0.45)
				if (stereoOn) { // Cardboard
					sc = SinCos(this.DOcontrols.alphaOffsetAngle - g(90), 0.15)
					s2 = SinCos(this.DOcontrols.alphaOffsetAngle - g(180), 0.45)
				}
				mesh2Segway.rotation.y = camera.rotation.y + g(180)  // -z?
				mesh2Segway.position.set(camera.position.x - sc[0] + s2[0], 0.5,  // -0.85
					camera.position.z - sc[1] + s2[1])
			}

			this.heading = Math.floor(this.DOcontrols.heading || 0) + r(this.DOcontrols.orient || 0) // Grad +1 1    BEI  iOS
			if (this.heading > 360) this.heading -= 360 // magnetisch

			//// EICHEN der Richtung: Wo war Norden, als das relative Alpha 0 entstand?
			if (this.DOcontrols.alphaOffsetAngle == 0 && this.heading != 0 && !stereoOn) {
				this.DOcontrols.updateAlphaOffsetAngle(-g(this.heading))
				log(this.heading)
				alert("hhh" + this.heading)
			}

			if (!touchable) this.heading = -r(camera.rotation.y)

			if (key_1 && keyShift) { key_1 = false; cookie_set() } // set/store
			if (key_1 && !keyShift) { key_1 = false; cookie_get() } // restore
			if (key_2 && keyShift) { key_2 = false; cookie_set() } // set/store
			if (key_2 && !keyShift) { key_2 = false; cookie_get() } // restore
			if (key_3 && keyShift) { key_3 = false; cookie_set() } // set/store
			if (key_3 && !keyShift) { key_3 = false; cookie_get() } // restore
			if (key_4 && keyShift) { key_4 = false; cookie_set() } // set/store
			if (key_4 && !keyShift) { key_4 = false; cookie_get() } // restore

			if (key_L) {
				key_L = false

				var pos = undefined
				var min = 9e9
				for (var ai in avatars) {
					var a = avatars[ai]
					var dx = Math.abs(a.position.x - camera.position.x)
					var dy = Math.abs(a.position.y - camera.position.y)
					var d = Math.sqrt(dx * dx + dy * dy)
					if (min > d) {
						min = d
						pos = a.position
					}
				}


				if (pos) {
					camera.position.x = pos.x // Teleportiere 50 südlich vom "user"
					camera.position.y = pos.y
					camera.position.z = pos.z + 50
					camera.rotation.x = 0
					camera.rotation.y = 0
				}
			}


			if (key_N) {
				key_N = false
				var text = prompt("Place a GO-note:", "");
				if (text) {
					//log("NOTE:"+text)
					var node = new Node(osmBnode_id, camera.Lat(), camera.Lon())
					node.AddTag("GO-Note", text)
					node.AddTag("From", " you ")
					inc_osmBnode_id()
					node.Place(0)

					var xmlhttp = new XMLHttpRequest()
					xmlhttp.open("GET", "./xchg.php?note=" + userName + ";" + camera.Lat() + ";" + camera.Lon() + ";" + text, true)
					xmlhttp.send()
				}
			}


			if (key_C || key_T) {
				key_C = key_T = false
				hud.Out([chat3, chat2, chat1, chat0])
				set_userSet(true)
				var text = prompt("Chat:", "");
				log("CHAT:" + text)

				if (text) {
					var xmlhttp = new XMLHttpRequest()
					xmlhttp.open("GET", "./xchg.php?chat=" + userName + ":" + text + ";#######", true)
					xmlhttp.send()
				}
			}

			if (key_I) {
				if (keyShift) hud.Height(-dt)
				else hud.Height(+dt)
			}

			if (dbg > 9) log("goControl update ENDE")
		}
	} // update Zyklisch





	// Zeiger Maus UND Touch  ////////////////////////////////////////////////////////////////  


	this.PointStart = function (event) {
		/*with (this)*/ {
			PointDH = PointDV = 0
			pStartX = camera.position.x; rStartX = camera.rotation.x
			pStartY = camera.position.y; rStartY = camera.rotation.y
			pStartZ = camera.position.z; rStartZ = camera.rotation.z
			var f = 7; if (touchable) f = 5
			PointGlobe = (PointH > this.wWidth - this.wMax / f)
				&& (PointV < this.wMax / f)
			DevOrConsOn = false
			if (dbg > 1) log("PointStat " + PointGlobe + " " + PointH + "-" + this.wWidth + "  " + PointV + "-" + this.wMax / f)
		}
	}

	this.PointEnd = function (event) {
		/*with (this)*/ {
			if (Math.abs(PointDH) < 4
				&& Math.abs(PointDV) < 4) // Kein Drag, Kick!		
			{
				if (dbg > 2) log("Klick/Tap", PointDH + "/" + PointDV)
				if (hud && PointF) hud.Point(PointH, PointV)
			}
			PointGlobe = false
		}
	}



	//// Maus ////

	this.onContextMenu = function (event) { /*with (this)*/ { event.preventDefault() } }

	this.onMouseWheel = function (event) {
		/*with (this)*/ {
			event.preventDefault();
			WheelD = 0;
			if (event.wheelDelta !== undefined)  // WebKit / Opera / Explorer 9
				WheelD = event.wheelDelta
			else if (event.detail !== undefined)  // Firefox
				WheelD = -event.detail
			if (WheelD != 0) {
				if (Math.abs(WheelD) != 1)
					log("Wheel:", WheelD)
				if (WheelD > 0) WheelD = +1
				else WheelD = -1
			}
			DevOrConsOn = false
		}
	}


	this.onMouseDown = function (event) {
		/*with (this)*/ {
			if (stereoOn) return
			this.kmt++
			event.preventDefault();  // Verhindere normale Rekation vom Fenster
			event.stopPropagation(); // Stop what?
			// Anfang der Bedienung merken
			this.PointHStart = PointH = event.pageX
			this.PointVStart = PointV = event.pageY
			this.PointStart()
			// Art der Bedienung merken
			switch (event.button) { // 0/2/1 = Linke/Rechte/Mittlere-Maustaste = PointFirst/Secoud/Third
				case 0: PointF = true; log("Mouse F:", PointH, PointV); break
				case 2: PointS = true; PointF = false; log("Mouse S:", PointH, PointV); break
				case 1: PointT = true; PointS = false; log("Mouse T:", PointH, PointV); break
			}
			var show = "default"
			if (PointF) show = "move"
			if (PointS) show = "pointer"
			document.getElementById("container").style.cursor = show
		}
	}


	this.onMouseMove = function (event) {
		/*with (this)*/ {
			if (stereoOn) return
			// Neue Maus-Position merken
			PointH = event.pageX; PointDH = PointH - this.PointHStart
			PointV = event.pageY; PointDV = PointV - this.PointVStart
		}
	}


	this.onMouseUp = function (event) {
		/*with (this)*/ {
			if (stereoOn) return
			event.preventDefault();
			event.stopPropagation();
			this.PointEnd()
			PointF = PointS = PointT = false
			switch (event.button) {
				case 0: PointF = PointS = PointT = false; log("mouse-F:", PointH, PointV); break
				case 2: PointS = PointT = false; log("mouse-S:", PointH, PointV); break
				case 1: PointT = false; log("mouse-T:", PointH, PointV); break
			}
			document.getElementById("container").style.cursor = "default"
		}
	}


	this.onfokus = function (event) {
		this.Stop(); //keyUp = keyDown = keyLeft = keyRight = false
	}


	// KEYBOARD - TASTATUR ////////////////////////////////////////////////////////////////
	// Für alle relevante Tasten gibt es eine Zustands-Bool
	// Die Reaktion wird anderswo zugeordnet
	////// Tastendruck/loslassen

	this.onKeyDown = function (event) {
		this.onKeyX(event, true); DevOrConsOn = false; this.kmt++; if (dbg > 0)
			log("KEYv:" + (event.code || event.key) + " " + (event.timeStamp - lastStamp)); lastStamp = event.timeStamp
	}
	this.onKeyUp = function (event) { this.onKeyX(event, false); if (dbg > 1) log("Key^:" + event.code + " " + (event.timeStamp - lastStamp)); lastStamp = event.timeStamp }
	this.onKeyX = function (event, down) {
		/*with (this)*/ {

			keyShift = event.shiftKey
			keyAlt = event.altKey
			keyCtrl = event.keyCtrl

			var keyCode = event.keyCode

			if (keyAlt && keyCmd
				&& keyCode != keyAlt && keyCode != keyCmd) {
				keyLeft = keyRight = false
				return // both are pressed: prozess no other keys, broswer-tab change
			}


			switch (keyCode) {   ////// Tastenänderung

				// Shift is the most critical key. And return instead of break may speed up things
				case 16: break // keyShift = down ;return // macOS & Wind

				// Also critical								// The other dirction is switched of, to fight missing low-events
				case 65: /*key_A  */ case 37: keyLeft = down; keyRight = false; break
				case 87: /*key_W  */ case 38: keyUp = down; keyDown = false; break
				case 68: /*key_D  */ case 39: keyRight = down; keyLeft = false; break
				case 83: /*key_S  */ case 40: keyDown = down; keyUp = false; break
				case 171:/* +     */
				case 221:/* *   shilft+ */
				case 187:/* +   apple   */
				case 36: /*keyHome*/ case 33: keyPUp = down; keyPDown = false; break // Der gleiche Code kommt auch bei Apple, beim MacAir ohne eigene Tasten als [fn]+Up/Down
				case 198:/* -     */
				case 163:/* #     */
				case 222:/* '   shilft# */
				case 220:/* #   apple   */
				case 35: /*keyEnd */ case 34: keyPDown = down; keyPUp = false; break

				case 12:						 // "center" of arrows macOS?? & Wind
				case 13: keyEnter = down; break
				case 32: keySpace = down; break
				case 17: break //keyCtrl  = down ;break // macOS & Wind
				case 18: break //keyAlt   = down ;break // macOS & Wind
				case 27: keyEsc = down; break // macOS & Wind
				case 91:  						  // macOS Chrome
				case 224: keyCmd = down; break // macOS Firefox

				case 48: key_0 = down; break
				case 49: key_1 = down; break
				//   51:  key_3 see below!
				//   52:  key_4    = down ;break
				case 57:/*key_9*/    inc_dbg(); break
				//   63:  keyQuestionmark ? see below
				//   65:  key_A    = down ;break = left
				case 66: key_B = down; animate(); break
				case 67: key_C = down; break
				//   68:  key_D 	 dbg++;break = right
				//se 71:  if(!down) { window.open(httpx+"osmgo.org","_self")  ;break } // Key "G" for Geo-Locaton / GPS oder Browser Location-Service
				//se 72:  /* H */         break
				case 72: if (!down) { if (hud) hud.DbgOn(0); break }  // keyH   On(0) = Toggle
				case 73: key_I = down; break

				case 76: key_L = down; break
				case 77: key_M = down; break
				case 78: key_N = down; break
				case 79: key_O = down; break
				case 80: key_P = down; break
				case 82: key_R = down; break
				//se 83:  key_S    = down ;break = down
				case 84: key_T = down; break
				//se 87:  key_W    = down ;break = up 
				case 88: key_X = down; break
				case 90: key_Z = down; break


				/* Einzel-/Toggle-Bediendungen   AUS, nur statisch!
				case 51:  if(down)  // key_3
							{	if(stereoOn==0) stereoOn = 1
								else if(stereoOn==1) stereoOn = 0
								log(stereoOn)
								camera.aspect = this.wWidth / this.wHeight
								camera.updateProjectionMatrix()
							}
						  break ****************/


				case 63:  // ==>																// Questionmark or Scharfes-ß weil Shift hier egal ist
				case 112: if (!down) { window.open(httpx + "osmgo.org/info", "_blank"); break }	// "F1" for Help

				default:

					if (hud) hud.Out([// dddd
						"**** CONTROLS",
						"?: Or 'F1' for help",
						"0: Or 'o' for teleport home (Start position)",
						"X: Switch between View- and Avatar-Mode",
						"1: Recall position marker. Shift-1 to set",
						"P: Show nearest Panoramax/Mapillary Picture",
						"M: Goto to 2D-Map.  Shift-M reload and show URL",
						"Esc: to stop all moves - WASD: like the cursorkeys",
						"**** MULTIUSER",
						"C: or T: Chat (global)",
						"N: Node place (global)",
						"Z: Zoom in. Shift-Z: Zoom out",
						"L: FoLLow other present user (experimental)",
						"**** DEBUG",
						"R: Send test-Report by mail",
						"B: Blocked Tileload repeat",
						"H: Headup Display Info on",
						"9: More Debug-Log outputs",
						"I: Increase height of selected. Shift-I to decrease",
						"**** HAVE FUN!"])

			}//switch

			//log("key down",keyCode,down)
		}
	} //onKeyX


	//// Touch ////


	this.onTouchStart = function (event) {
		event.preventDefault();
		/*with (this)*/ {  /// Touch START ////////////////////
			this.kmt++
			event.preventDefault();
			event.stopPropagation();
			PointF = false;  // erst mal alle aus
			PointS = false;
			PointT = false;
			PointDH = 0
			PointDV = 0
			switch (event.touches.length) {  // 1/2/3=1/2/3-Finger-Touch
				case 1: PointF = true;
					// Anfang der Bedienung merken
					this.PointHStart = PointH = event.touches[0].pageX
					this.PointVStart = PointV = event.touches[0].pageY
					this.PointStart(); log("Point F:", PointH, PointV)
					break;
				case 2: PointS = true;
					// Anfang der Bedienung merken: Mittelwert aus 1. und 2. Touch
					this.PointHStart = PointH = (event.touches[0].pageX + event.touches[1].pageX) / 2
					this.PointVStart = PointV = (event.touches[0].pageY + event.touches[1].pageY) / 2
					this.PointStart(); log("Point S:", PointH, PointV)
					// DeltaPoint: Abstand der beiden Punkte
					PointDStart = PointD = Phytagoras(event.touches[0].pageX - event.touches[1].pageX,
						event.touches[0].pageY - event.touches[1].pageY)
					break
				case 3: PointT = true;
					this.PointHStart = PointH = event.touches[0].pageX
					this.PointVStart = PointV = event.touches[0].pageY
					this.PointStart(); log("Point T:", PointH, PointV)
					break;
			}
		}
	}

	this.onTouchMove = function (event) {
		event.preventDefault();
		/*with (this)*/ {  /// Touch MOVE /////////////////////
			if (!PointF && !PointS && !PointT) return; // alert("move vor touch kommt vor")
			event.preventDefault();
			event.stopPropagation();
			PointH = event.touches[0].pageX // Den ersten Touch gibt es immmer
			PointV = event.touches[0].pageY

			if (event.touches.length >= 2) {  // Zwei-Punkte-Touch
				PointD = Phytagoras(PointH - event.touches[1].pageX,		// DeltaPoint: neuer Abstand der beiden Punkte
					PointV - event.touches[1].pageY)
				PointH = (PointH + event.touches[1].pageX) / 2    // x,y-Mittelwert aus 1. und 2. Touch
				PointV = (PointV + event.touches[1].pageY) / 2
			}
			PointDH = PointH - this.PointHStart
			PointDV = PointV - this.PointVStart
		}
	}

	this.onTouchEnd = function (event) {
		event.preventDefault();
		/*with (this)*/ {  /// Touch END //////////////////////
			event.preventDefault();
			event.stopPropagation();
			this.PointEnd()
			PointF = PointS = PointT = false // ok??
			//this.onTouchCancel()
		}
	}

	// Geht nicht
	this.onbeforeunload = function () {
		/*with (this)*/ {
			alert("onbeforeunload")
			log("onbeforeunload")
		}
	}



	{  /// Hier noch ein Stück Konstruktor! Denn erst hier kann eine Mehtode auch aufgerufen werden
		/// Sollen wir gleich ALLES hier her verschieben?
		///////////////////////////////////////////////////////////////////////////////////////////////////

		this.onWindowResize()

		//////// Da die System-Callback keine Klassen kennen, hier je eine Hilfsfuntion, namenlos unsichtbar inline
		window.addEventListener('orientationchange', function (event) { control.onScreenOrientation(event) }, false)
		window.addEventListener('resize', function (event) { control.onWindowResize(event) }, false)
		window.addEventListener('onbeforeunload', function () { control.onbeforeunload() }, false)  // Geht nicht

		window.addEventListener('onfokus', function (event) { control.onFokus(event) }, false)
		window.addEventListener('onfokusout', function (event) { control.onFokus(event) }, false)

		//???w.addEventListener('devicemotion',    	   function(event){control.handleDeviceMotionEvent(event)}, false);

		document.addEventListener('keydown', function (event) { control.onKeyDown(event) }, false);
		document.addEventListener('keyup', function (event) { control.onKeyUp(event) }, false);
		if (touchable) {
			document.addEventListener('gesturestart', function (event) { event.preventDefault() }, false);
			document.addEventListener('touchstart', function (event) { control.onTouchStart(event) }, false);
			document.addEventListener('touchmove', function (event) { control.onTouchMove(event) }, false);
			document.addEventListener('touchend', function (event) { control.onTouchEnd(event) }, false);
			//document.addEventListener("touchcancel",       function(event){control.onTouchCancel          (event)}, false); // boddy
		} else {
			document.addEventListener('mousedown', function (event) { control.onMouseDown(event) }, false);
			document.addEventListener('mousemove', function (event) { control.onMouseMove(event) }, false);
			document.addEventListener('mouseup', function (event) { control.onMouseUp(event) }, false);
			document.addEventListener('mousewheel', function (event) { control.onMouseWheel(event) }, false);	// Non-Firefox
			document.addEventListener('DOMMouseScroll', function (event) { control.onMouseWheel(event) }, false);	// Firefox
			document.addEventListener('contextmenu', function (event) { control.onContextMenu(event) }, false); // Contextmenu disable

		}

		if (dbg > 2) log("goControl ENDE - Constructor")

	} /// noch Konstruktor


	/////////////////////////////////////////////////////////////////////////////////////////
}// KLASSE goControl ENDE ////////////////////////////////////////////////////////////////
// Hier ist erst richtig das Ende der Klasse Kontrol  ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////



function cookie_set() {
	var cookie = 'OSM_go_posrot='
		+ camera.position.x + ' '
		+ camera.position.y + ' '
		+ camera.position.z + ' '
		+ camera.rotation.x + ' '
		+ camera.rotation.y + ' '
		+ camera.rotation.z + ' '
	document.cookie = cookie;
	if (dbg > 0) log(cookie);
}

function cookie_get() {

	if (document.cookie.indexOf('OSM_go_posrot') == -1) return   // cookie exists?       

	var cookie = getCookie('OSM_go_posrot');
	if (dbg > 0) log("cookie", cookie);

	var floats = cookie.split(' ');
	camera.position.x = parseFloat(floats[0]);
	camera.position.y = parseFloat(floats[1]);
	camera.position.z = parseFloat(floats[2]);
	camera.rotation.x = parseFloat(floats[3]);
	camera.rotation.y = parseFloat(floats[4]);
	camera.rotation.z = parseFloat(floats[5]);
	camera.updateProjectionMatrix();
}


function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') c = c.substring(1);
		if (c.indexOf(name) != -1) return c.substring(name.length, c.length);
	}
	return "";
}





/////////////  DeviceOrientationControls ////////////////////



/**
 * @author richt / http ://richt.me
 * @author WestLangley / http ://github.com/WestLangley
 *
 * W3C Device Orientation control (http ://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

var DeviceOrientationControls = function (camera) {

	var scope = this;

	this.camera = camera;
	this.camera.rotation.reorder("YXZ");

	this.enabled = true;

	this.deviceOrientation = {};
	this.screenOrientation = 0;

	this.alphaOffsetAngle = 0;
	this.alpha = 0
	this.beta = 0
	this.gamma = 0

	this.heading = 0 // magnetisch

	var onDeviceOrientationChangeEvent = function (event) {
		scope.deviceOrientation = event;
	};


	var onScreenOrientationChangeEvent = function () {
		scope.screenOrientation = window.orientation || 0;
	};


	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

	var setCameraQuaternion = function () {

		var zee = new THREE.Vector3(0, 0, 1);
		var euler = new THREE.Euler();
		var q0 = new THREE.Quaternion();
		var q1 = new THREE.Quaternion(- Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

		return function (quaternion, alpha, beta, gamma, orient) {
			euler.set(beta, alpha, - gamma, 'YXZ'); // 'ZXY' for the device, but 'YXZ' for us
			quaternion.setFromEuler(euler); // orient the device
			quaternion.multiply(q1); // camera looks out the back of the device, not the top
			quaternion.multiply(q0.setFromAxisAngle(zee, - orient)); // adjust for screen orientation
		}

	}();


	this.connect = function () {
		if (!DevOrConsOn) return
		onScreenOrientationChangeEvent(); // run once on load
		window.addEventListener('orientationchange', onScreenOrientationChangeEvent, false);
		window.addEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);
		scope.enabled = true;
	};


	this.disconnect = function () {
		if (!DevOrConsOn) return
		window.removeEventListener('orientationchange', onScreenOrientationChangeEvent, false);
		window.removeEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);
		scope.enabled = false;
	};


	this.update = function () {
		if (scope.enabled === false) return;

		this.heading = scope.deviceOrientation.webkitCompassHeading ? scope.deviceOrientation.webkitCompassHeading : 0; // Magnetisch

		var alpha = (scope.deviceOrientation.alpha ? g(scope.deviceOrientation.alpha) : 0) + this.alphaOffsetAngle; // Z   Offset magnetisch oder Segway
		var beta = scope.deviceOrientation.beta ? g(scope.deviceOrientation.beta) : g(90 + 5); // X'
		var gamma = scope.deviceOrientation.gamma ? g(scope.deviceOrientation.gamma) : 0; // Y''
		var orient = scope.screenOrientation ? g(scope.screenOrientation) : 0; // O


		setCameraQuaternion(scope.camera.quaternion, alpha, beta, gamma, orient);
		this.beta = beta;
		this.gamma = gamma;
		this.alpha = alpha;

		// alert("aaa: "+ alpha +" ! "                        +scope.deviceOrientation.alpha + " ! " + this.alphaOffsetAngle )

	};


	this.updateAlphaOffsetAngle = function (angle) {
		this.alphaOffsetAngle = angle;
		this.update();
		alert("updateAlphaOffsetAngle: " + angle)
	};


	this.dispose = function () {
		this.disconnect();
	};


	this.connect();

};



function getGeolocation(location) {
	//alert("TEST: Android-Gerät mit GPS aus aum Bowser stellt keine Frage und kommt nie hier her");  return
	teststr = "getGeolocation"
	////// https://developer.mozilla.org/de/docs/Web/WebAPI/verwenden_von_geolocation
	set_lalo(location.coords.latitude, location.coords.longitude,)
	accuracy = location.coords.accuracy
	if (accuracy < accuOld) {  // Nullpunkt = bei besserem GPS-Wert 
		set_accuOld(accuracy)
		lat0 = latitude
		// lon0 = longitude
		// alert(lat0,lon0)
	}
	if (gpsAct && lat0 != 0 && gpsOn) {
		set_gpsAct_pos(
			new THREE.Vector3(
				GetLon2x(longitude, latitude),
				GetLat2z(latitude),
				0
			)
		)
		//log(lon,lat,posX,posZ)
	}
	if (lat0 != 0 && gpsOn && DevOrConsOn) {
		camera.position.x = +GetLon2x(longitude, latitude);
		camera.position.z = +GetLat2z(latitude);
		//log(lon,lat,posX,posZ)
	}

	if (navigator.platform == "MacIntel") return
	if (navigator.platform == "Win32") return

	if (!navigator.geolocation.watchPosition)
		navigator.geolocation.getCurrentPosition(getGeolocation)
}




// building:part OHNE relation = immer darestellen?  relation=644901 (weg editiert)





//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////





//-----------------------------------------------------------------------------
/** w3dFlight.js - Bewegungssteuerung fuer fliegende Objekte        2017-11-03
 */

var FlightObject = function () {      // als Objekt geklammert

	var flightObj;                        // das zu steuernde Mesh-Objekt
	var powFakt;                          // Leistungsfaktor im Arkade-Mode

	var velCur;                           // akt. Geschwindigkeit
	var accCur;                           // akt. Beschleunigung
	var fSide = 0;
	var fHei = 0;

	//-----------------------------------------------------------------------------

	return {

		//-----------------------------------------------------------------------------
		/** Initialisierung
		 * 
		 *
		 * obj - das Mesh-Objekt, das gesteuert werden soll
		 */
		init: function (obj) {

			this.flightObj = obj;
			this.velCur = 0;
			this.accCur = 0;
			this.powFakt = 0.3;             // Leistung 0.1 bis 1.0
		},

		fObj: function () {
			return this.flightObj;
		},

		//-----------------------------------------------------------------------------
		/** Zyklische Funktion
		 * 
		 *
		 * dt - Millisekunden seit letztem Aufruf
		 * fSide - Steuerbewegung links/rechts, -1.0 bis + 1.0 (TODO)
		 * fHei - Steuerbewegung runter/rauf, -1.0 bis +1.0 (TODO)
		 */
		cycle: function (dt, sSide, sHei, sSpeed, yBoden) {
			/*with (this)*/ {

				var VEL_LIFT = 10			// = 36km/h = 36000m/3600s   //  15.0 * 0.278; // Geschw. zum Abheben in m/s
				var ACC_LIMIT = 9.5;        // Grenze der Beschleunigung  1.5
				var ROT_LIMIT = 25.0;       // Grenze der Drehgeschwindigkeit

				if (dt > 100) dt = 100


				var obj = this.flightObj;
				var posX = obj.position.x;
				var posY = obj.position.y;
				var posZ = obj.position.z;
				var rotX = obj.rotation.x * 180 / Math.PI;
				var rotY = obj.rotation.y * 180 / Math.PI;
				var rotZ = obj.rotation.z * 180 / Math.PI;

				var dSide = sSide - fSide
				var dHei = sHei - fHei
				var mSide = 0.5 * dt
				var mHei = 0.5 * dt

				if (dSide > 0) { if (dSide > +mSide) dSide = +mSide }
				else { if (dSide < -mSide) dSide = -mSide }
				if (dHei > 0) { if (dHei > +mHei) dHei = +mHei }
				else { if (dHei < -mHei) dHei = -mHei }

				fSide += dSide
				fHei += dHei

				if (sSpeed) {
					this.powFakt *= (1 + 1 * sSpeed * dt / 1000)
					if (this.powFakt > 20.0) this.powFakt = 20.0
					if (this.powFakt < 1.0) this.powFakt = 1
				} else
					if (this.powFakt > 1.0) this.powFakt *= (1 - dt / 1000)

				// Seitwaerts-Neigung und Kursrichtung
				var rotDest = fSide;
				if (rotDest < -ROT_LIMIT)
					rotDest = -ROT_LIMIT; else
					if (rotDest > +ROT_LIMIT)
						rotDest = +ROT_LIMIT;
				//        rotY -= rotDest * dt * 0.002; // Blickrichtung integrierend fff



				var accDest = fHei;
				if (accDest < -ACC_LIMIT)
					accDest = -ACC_LIMIT; else
					if (accDest > +ACC_LIMIT)
						accDest = +ACC_LIMIT;

				this.accCur += (accDest - this.accCur) * dt * 0.002;
				this.velCur += this.accCur * dt * 0.004;

				var velMax = VEL_LIFT + 2.0 + posY * 0.26 * this.powFakt
				if (this.velCur < 0)
					this.velCur = 0; else
					if (this.velCur > velMax)
						this.velCur = velMax; else
						if ((posY > yBoden) && (this.velCur < VEL_LIFT + 1.0))
							this.velCur = VEL_LIFT + 1.0;
				if (this.velCur > VEL_LIFT) {
					// Steigrate weich nachfuehren
					var dh = this.accCur * this.powFakt;
					this.dhCur += (dh - this.dhCur) * dt * 0.0001;
					// Hoehenaenderung je nach Steigrate
					posY += this.accCur * dt * (posY + 3) * 0.00005;
				}

				//---------------
				// in der Luft effektive Geschwindigkeit je nach Leistung
				var velEff = this.velCur;
				if (posY > yBoden)
					velEff = VEL_LIFT + (posY - yBoden) * this.powFakt * 0.5;
				//---------------

				var rxDest = 0;
				var rzDest = 0;
				if (posY <= yBoden + 0.0001) { // am Boden ?
					posY = yBoden;    // nicht abtauchen
					// Rollwiderstand bremst allmaehlich ab
					this.velCur -= this.velCur * dt * 0.002;    // Rollwiderstand
				} else {                // in der Luft
					// je mehr Hoehe desto mehr Blick nach unten
					rxDest = this.accCur // karl * 8.0 - posY*0.1;
					rzDest = -rotDest * 1.5;
				}
				// Neigungswinkel sanft nachführen
				rotX += (rxDest - rotX) * dt * 0.006;
				rotZ += (rzDest - rotZ) * dt * 0.001;
				rotY += rotZ * dt * 0.002; // Blickrichtung integrierend fff

				//  if (posY <= yBoden)
				//???      rotY += accDest * dt * velEff * 0.001

				if (rotY >= 360) rotY -= 360;
				else if (rotY < 0) rotY += 360;

				// Bewegungsrichtung, Winkel
				var wi = rotY * Math.PI / 180;
				var dxMove = Math.sin(wi);      // Anteil 0 bis 1 je Richtung X/Z
				var dzMove = Math.cos(wi);

				// s = v * t, Wegstrecke in diesem Zyklus
				var dWeg = velEff * dt * 0.001;  // this.velCur 

				// Vorwaertsbewegung integrieren
				posX -= dxMove * dWeg;
				posZ -= dzMove * dWeg;

				obj.position.set(posX, posY, posZ);
				obj.rotation.set(rotX * Math.PI / 180, rotY * Math.PI / 180, rotZ * Math.PI / 180);

			}
		}

	};    // Ende return{}
};      // Ende FlightObject()


export { goControl };