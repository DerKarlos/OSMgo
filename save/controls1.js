function g(grad) {   //   Vollkreis 360 in Rad wandeln
	return   grad / 180 * Math.PI
}

function r(grad) {
	return   grad * 180 / Math.PI
}

function SinCos(a,r){
	if(!r) r=1
	return  [ Math.sin(a)*r
			, Math.cos(a)*r
			];
}

var max_xz = false
var max_dt = 3333


function Phytagoras(a,b){ return Math.sqrt( a*a + b*b ); }


function Integrator(ini) {
	if(!ini)   ini = 0
	this.val = ini // actual integration value
}


Integrator.prototype.stop  = function() {
	this.val = 0
}

Integrator.prototype.update = function(active,plus,minus,aUp,aMax,dt,aDown) { with(this) {
	
	if(dt>max_dt) dt= max_dt // schummel aber beruhigt Bewegungen
	if(!aDown) aDown = 0
	if(aMax==0) aMax = 1e33 // Unlimited
	var slow = true
	if(active) {
		if(plus)  { val += aUp*dt ;if(val> +aMax) val = +aMax ;slow=false }
		if(minus) { val -= aUp*dt ;if(val< -aMax) val = -aMax ;slow=false }
	}

	if(slow)
	{	
		if(aDown>0) {
			var slowdt = aDown*dt
			if(Math.abs(val) < slowdt) val = 0
			else {
				if(val>0)	val -= slowdt
				else		val += slowdt
			}
		}
		else {  // Stop in about 1 second (1000ms)
			var slowdt = val*10*dt  // 10=? 
			if( Math.abs(val) < Math.abs(slowdt) ) val = 0
			else val -= slowdt
		}
	
	}

    return val * dt // acceleration per time
}}




function SpeedControl(aUp,aDown,aMax) { ///////////////// SPEED CONTROL //////////////////////////

	if(!aMax)  aMax  = 1e33 // unlimited
	if(!aDown) aDown = aUp	// symetric

	this.aMax  = aMax
	this.aUp   = aUp
	this.aDown = aDown

	this.val   = 0 // actual integration value
	this.pass0 = 0
}


SpeedControl.prototype.slow = function(dt,aDownP) { with(this) {
	if(dt>max_dt) dt= max_dt
	var slowdt = aDownP*dt
	if(Math.abs(val) < slowdt) val = 0
	else {
		if(val>0)	val -= slowdt
		else		val += slowdt
	}
}}

SpeedControl.prototype.update = function(shiftAlt,plus,minus,dt) { with(this) {
	
	var autoSlow = true
	
	if(shiftAlt) {
		var a = aUp*dt
		var b = val

		if(plus) {
			autoSlow=false 
			if(val<0) a*=2 // breaking? twice as strong
			b = val+a
			if(b > +aMax)						b = +aMax // maximum
		}
		
		else
		if(minus) {
			autoSlow=false 
			if(val>0) a*=2
			b = val-a
			if(b < -aMax)						b = -aMax // minimum
		}
		else pass0 = 0

		if(val !=0)
		if(Math.sign(val) != Math.sign(b))	// passing zero? wait for 0.5s
		{ pass0 = 0.3 ; val = 0 }
		
		if( pass0>0 )
			pass0 -= dt
		else val = b
		
	}

	if(autoSlow)
	{	
		if(aDown>0 && !keyEsc) {
			var slowdt = aDown*dt
			if(Math.abs(val) < slowdt) val = 0
			else {
				if(val>0)	val -= slowdt
				else		val += slowdt
			}
		}
		else {  // Stop in about 1 seconds
			var slowdt = val*10*dt
			val -= slowdt
		}
	
	}

    return val * dt // acceleration per time
}}
      


	  
	  


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


function goControl(webGLRenderer,camera) {
	
	if(dbg>2) log("goControl INIT - Constructor")  
	this.DOcontrols  = new THREE.DeviceOrientationControls(camera)
	
	// this oder var oder nix? Wir brauchen nur eine Instanz, also kein this. Nix würde es ausserhalb des Namespaces sichtbar machen, also "var". Stimmt das alles???
	
	// Parameter abspeichern
	var camera        = camera
	var webGLRenderer = webGLRenderer
	
	// Instanzvariable = Extern erreichbar machen
	this.screenOrientation = window.orientation || 0
	this.heading  = 0 // Magnetisch
	this.wWidth   = 0
	this.wHeight  = 0
	this.wMin     = 0
	this.wMax     = 0

	
	//// Klassen-Lokale Variablen /////////////////////////////////////////
	var accuracy = 0
	
	// Kammera Blickrichtung horizontal - in RAD! Nur in URLs sind es GRAD. 0=Nord, gegen Uhrzeiger ansteingend bis PI*2 (360°)
	// Kammera Blickrichtung vertikal   - in RAD! Nur in URLs sind es GRAD. 0=Horizont <0 tiefer, >0 höher      bis PI/2  (90°)
	                   if(GET_Par("ele"))  posY0 =  (GET_Par( "ele")) *1 // *1 muss sein, sonst kommt das als String! ÄH ???
	var dir  =     0  ;if(GET_Par("dir"))  dir   = g(GET_Par( "dir"))
	var view = g(-10) ;if(GET_Par("view")) view  = g(GET_Par("view"))

	// 1=Inspect 2=SegWay   3=...
	this.controlMode = GET_ParD("con",3)
	if(gCustom==2) this.controlMode = 2
	if(this.controlMode==2) { posY0 = 1.6 ;view = 0 }
	
	var fovCam  = 0
	// Mach mal XYZ in ein Vector3 !!???
	var posY = posY0
	var posX = posZ = 0
	var adpX = adpY = adpZ = 0
	
	var rotX = view
	var rotY = dir
	var rotZ = 0
	
	var adrX = adrY = adrZ = 0
	var posR = posF = 0
	var adpR = adpF = 0
							   
	var vCardF = 0
	var lCardY = 0 // last Kamera Y
	var eCardY = 0 // Everidge dY
	
	// Für Tastatur
	var keyCmd   = keyShift
	  = keyAlt   = keyCtrl	
	  = keyPUp   = keyPDown
	  = keyUp    = keyDown
	  = keyLeft  = keyRight
	  = keyEnter = keySpace = keyEsc= false
	var key_0 = key_1 = key_9 = false
	var key_B = key_C = key_L = key_M = key_N = key_O = key_X = key_Z = false
	
	
	// Für Pointer (Maus&Touch)
	var PointF = false // First-Pointer aktiv: Erste Maus geklickt, 1-Finger-Touch berührt screen
	var PointS = false // Second
	var PointT = false // Third
	var PointV = 0;  var PointVStart = 0; var PointDV // Positionen auf dem Bildschrim beim Bedienen
	var PointH = 0;  var PointHStart = 0; var PointDH
	var PointD = 1;  var PointDStart = 1 // 1!
	var PointGlobe = false
	var WheelD = 0;	 // Bewegung des Mausrads	
	var WheelX = 1.1;	 // Bewegung des Mausrads	
	
	// Werte der Kammear bei Point-Start
	var pStartX ;var rStartX
	var pStartY ;var rStartY
	var pStartZ ;var rStartZ
//	var lastPosition = camera.position
//	var lastRotation = camera.rotation
	var lastCamY
	var DevOrConsOn  = stereoOn // touchable // DeviceOrientationControls aktiv
	
	this.wWidth  = sceneContainer.offsetWidth
	this.wHeight = sceneContainer.offsetWidth
	if(stereoOn == -1) if(touchable && this.wWidth>this.wHeight) stereoOn = 1; else stereoOn = 0
	//log("control-init "+this.wWidth+" "+this.wHeight+" stereoOn:"+stereoOn,touchable)

	if(stereoOn) {
		this.controlMode = 2 //
		posY = posY0 = 1.6 // m
		rotX = view = 0
		
		// Test-Instrument
		var geometry = new THREE.PlaneBufferGeometry( 5, 1)
		var material = new THREE.MeshLambertMaterial( {color: 0xff0000, side: THREE.DoubleSide} )
		    testInst = new THREE.Mesh( geometry, material )
		    testInst.position.z = -10
		scene.add( testInst );		
	}
	
	if((navigator.geolocation) && (gpsOn)) {  // Gibt es GPS? Nicht Notebook Zyklisch emfangen
		var s = "GPS watch Currend?: "
		if(	 navigator.geolocation.watchPosition)		s += "w "
		if(	 navigator.geolocation.getCurrentPosition)	s += "C " 
		log(s) // ;alert(s)
		if(  navigator.geolocation.watchPosition)
			 navigator.geolocation.watchPosition(     getGeolocation)
		else navigator.geolocation.getCurrentPosition(getGeolocation)
	}
	else {
		teststr = "no GPS"
		if(log>2) log("--- no GPS - browser/device ---")
		lat0 = latitude  // 49.715603
		lon0 = longitude // 11.087147
		accuracy  = 11
	}

	//	var acc  = 10  ;if(keyDown && intPosF.val>0) acc  = 25
	this.speedPosF = new SpeedControl(10,0.1/*no max*/) // (aUp,aDown,aMax) 
	
	this.intPosF = new Integrator()
	this.intPosR = new Integrator()
	this.intPosY = new Integrator()

	this.intPo2F = new Integrator()
	this.intPo2Y = new Integrator()

	this.intRotX = new Integrator()
	this.intRotY = new Integrator()
	this.intRotZ = new Integrator()
	
	this.kmt     = 0	// Key,Mouse,Touch activity

	//----------------------------------------------------
	// pro forma Flugobjekt anlegen
//	var fObj = new THREE.Mesh() // buildDemoFlieger();
	//fObj.position.set(gd.posX, gd.posY, gd.posZ);
	//fObj.rotation.set(gd.rotX * Math.PI/180, gd.rotY * Math.PI/180, gd.rotZ * Math.PI/180);
//	fObj.rotation.y = 45 * Math.PI/180
//	fObj.position = camera.position
	//scene.add(fObj); fff
	if(gCustom!=2)
		this.Flight = new FlightObject()
//	this.Flight.init(fObj);
	//----------------------------------------------------
	
	//// Left notes
    var
	xmlhttpN = new XMLHttpRequest()
    xmlhttpN.onreadystatechange = function() {
        if ((xmlhttpN.readyState == 4) && (xmlhttpN.status == 200)) {
			var vs = xmlhttpN.response.split("<br>")
		    for (v in vs) {
				if(vs[v].length<9) continue
				//log("Note:",vs[v])
		    	var vi = vs[v].split(";")
				//      0         1             2                3          4
				// $jetzt+userName+";"+camera.Lon()+";"+camera.Lat()+";"+text
				var node = new Node(osmBnode_id,vi[2],vi[3])
				node.AddTag("GO-Note",vi[4])
				node.AddTag("From",vi[1])
				osmBnode_id++
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
this.Fullscreen          = function() { with(this) {
		 if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen()
	else if (sceneContainer.requestFullscreen)     sceneContainer.requestFullscreen()
	else if (sceneContainer.msRequestFullscreen)   sceneContainer.msRequestFullscreen()   
	else if (sceneContainer.mozRequestFullScreen)  sceneContainer.mozRequestFullScreen()
	
	//var lockedAllowed = window.screen.lockOrientation("portrait-primary");  alert(lockedAllowed)
}}

this.onWindowResize      = function() { with(this) {
	wWidth  = sceneContainer.offsetWidth
	wHeight = sceneContainer.offsetHeight
	camera.aspect = wWidth / wHeight  // >1 wenn Quer
	camera.updateProjectionMatrix()

	// Die längere Seite wird = 1
	var I = 1
	if( navigator.platform=="iPhone" ) I = 0.7
	
	if(!stereoOn) {
	    wMin      = wHeight
	    wMax      = wWidth
		if(wWidth < wHeight) {	// |Hochkant|
			wMin  = wWidth
			wMax  = wHeight
			cameraHUD.top    = I
			cameraHUD.right  = I*camera.aspect	// <1 = 0.x
		} else {				// <== Quer ==>
			cameraHUD.right  = I
			cameraHUD.top    = I/camera.aspect	// >1 = 1.x
		}
    cameraHUD.left   = -cameraHUD.right
	cameraHUD.bottom = -cameraHUD.top
	cameraHUD.updateProjectionMatrix()
	}


	var p = navigator.platform
	var r = 2
//	if( p=="iPhone" && wWidth<wHeight) r = 3.3	// hochkant   iPhone 980 1461 Quer:  980 h:551
//	if( p=="iPad"   && wWidth<wHeight) r = 2.5

	if(hud)   hud.Resize()
	
	if(stereoOn) stereoEffect.setSize(wWidth, wHeight)
	else         webGLRenderer.setSize(wWidth, wHeight)
}}

this.onScreenOrientation = function() { with(this) {
	screenOrientation = window.orientation || 0;
	Fullscreen()
}}
  


//// Hilfsfunktionen /////////////////////////////////


this.Phytagoras = function(a,b) { with(this) { return Math.sqrt( a*a + b*b ); }}

this.Reset = function(home) { with(this) {
	keyAlt = keyShift = keyUp = keyDown = keyPUp = keyPDown = keyRight = keyLeft = keyEnter = keySpace = false
	vCardF = 0

	camera.fov = fovDefault
	DevOrConsOn = stereoOn // touchable

	intPosF.val = 0
	this.intRotX.stop()
	this.intRotY.stop()
	this.intRotZ.stop()
	
	if(home) {
		camera.position.set( posX0, posY0,  posZ0 )
		camera.rotation.set(  view,   dir,      0 )
	}
}}
	
	
// Das ist hier nur Flickwerk!  ToDo???
// VR-Anteile des 2D-Vektor in XZ-Anteile aufteilen 
this.WalkPosi = function(forward,right){
	a = camera.rotation.y
	posX  =   pStartX
			+ Math.sin(a)* forward
			+ Math.cos(a)* right
	posZ  =   pStartZ
			+ Math.sin(a)*-right
			+ Math.cos(a)* forward
}

this.WalkPosAd = function(forward,right){
	a = camera.rotation.y
	adpX += ( Math.sin(a)* forward
			+ Math.cos(a)* right   )
	adpZ += ( Math.sin(a)*-right
			+ Math.cos(a)* forward )
}






////// update Zyklisch
this.update = function(dt) { with(this) {
	if(dbg>9)  log("goControl update START")

	if(replayI>0 && keyShift) replayI += 1


	lastCamY = camera.position.y
		  
	if( dt>max_dt) {	// Wenn Javascript mal wieder ein Päuschen macht,
		dt=max_dt		//  soll das riesen dt nicht alles wild toben lassen. Also alles begrenzen:
		keyAlt = keyShift = false // keyUp = keyDown = keyRight = keyLeft = keyEnter = keySpace = false
	}
	
	var b = 0
	var aSoll = 0
	var vSoll = 0
	if(DevOrConsOn) {
		DOcontrols.update()
		if(screenOrientation==0) {b = g(-90-5)+DOcontrols.beta                              	}	// vertical
		else 					 {b = g(+90-5)-DOcontrols.gamma ;if(b > Math.PI/2) b -= Math.PI	}	// horizontal
		//	alert(screenOrientation+" "+b+" "+DOcontrols.beta)

		var aa = DOcontrols.alpha - DOcontrols.alphaOffsetAngle	// Gerätebezogen ab Start original alpha 0-360 wobei der Wert immer um 0 schwanken sollte
		if(DOcontrols.gamma>0) aa -= g(180)
		if(aa>g(+180)) aa -= g(360) // aus  350 werden -10
		if(aa<g(-180)) aa += g(360)	// aus -270 werden +90
		var ax = Math.abs(aa)-g(10)	// Zu viel verdreht?
		if(ax>0) {
	    	DOcontrols.alphaOffsetAngle += (ax * Math.sign(aa) * dt * 1) // Segway langsam nachdrehen
		//	alert(r(DOcontrols.alpha)+" / "+r(DOcontrols.alphaOffsetAngle)+" / "+r(aa)+" / "+r(ax) )
		//	alert(r(DOcontrols.alpha)+" / "+r(DOcontrols.beta)+" / "+r(DOcontrols.gamma)+" / "+r(ax) )
		}
	}

	//?? was war das?? if(controlMode == 3) {		b = camera.rotation.x	}



	//b=0//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	if(b!=0) {		// View ahead up/down
		var bx = Math.abs(b)-g(10)	// Zu viel verdreht?
		if(bx>0)
	    	b = bx * Math.sign(b) // Segway langsam nachdrehen

		/*	Wie reagiert ein Segway? 
			Stillstand leichter: Winkel*Winkel => V-Soll (limitiert)
			Delta V-Soll/ist => Beschleunigung (limitiert!!) */
		    vSoll   = Math.min(b*b*200,10)  * Math.sign(b)	;if(vSoll>0) vSoll/=10 // backward solwer
		    aSoll   = Math.min( Math.max(vSoll-vCardF,-20),+20)
			vCardF += (aSoll*dt)
			adpF    = vCardF * dt
			adpR    = 0
	}
	vCardF *=  (1-dt/10) // Luftwiederstand und Reibung bremsen
	if(keyLeft || keyRight)	vCardF *= (1-dt* 5 ) // Kurve bremst
	if(keyEsc) {		    vCardF *= (1-dt*10 ) // Notbremse
					      //hud.Out()			 // klear hud
							keyAlt = keyShift = keyUp = keyDown = keyPUp = keyPDown = keyRight = keyLeft = keyEnter = keySpace = false
							if(hud)hud.Out([chat3,chat2,chat1,chat0])
			   }
/*		var rMax = 5
		if(camera.rotation.x < -g(rMax) ) camera.rotation.x = -g(rMax)
		if(camera.rotation.x > +g(rMax) ) camera.rotation.x = +g(rMax)  */
	
	/* Beim Unsehen soll angehalten werden. A) jede Drehung reduziert die Geschwindigkeit 
		B) Unruhe reduziert vSoll. Unruhe ist dY über die Zeit gemittelt  */
	var dY = Math.abs(camera.rotation.y - lCardY) / dt
	lCardY =          camera.rotation.y
	eCardY = (eCardY*10+dY)/11 // everidge
	vCardF *= Math.max(1 - dY*1,0) // Kurve bremst

	teststr = /*r(b)*/ dY.toFixed(2) + ":r a:" + aSoll.toFixed(2) + " v:" + vSoll.toFixed(2) + " i:" + vCardF.toFixed(2) + " s:" + adpF.toFixed(2)
			

	if( key_B ) {
		key_B = false
		tileLoading.state = 1// Load again
		tileLoading = false
		osmBuilder.LoadOsmTiles() // check for more to load
	}

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

	// Aktuelle Kamera-Werte lesen, neue addieren, scheiben
	
	var factPy = Math.abs(camera.position.y)/2; if(factPy<1) factPy=1
	var factPq = factPy = Math.sqrt(factPy)
	var AltShift = keyAlt || keyShift || PointGlobe
	


	if((this.controlMode==1) && (!DevOrConsOn)) { // 1=Inspect  2=SegWay   3=...
		// Position aus FR wird XZ. Dazu Y  (Forward,Right - X=Quer Z=Vorrück  Y=Höhe)
		adpF = intPosF.update(!AltShift, keyDown,     keyUp,   50, 0, dt) * factPq
		adpR = intPosR.update(!AltShift, keyRight,  keyLeft,   50, 0, dt) * factPy
		adpY+= intPosY.update( AltShift, keyEnter, keySpace,  100, 0, dt) * factPy
		adpY+= intPosY.update(     true, keyPUp,   keyPDown,  100, 0, dt) * factPy
		
		adpY+= intPo2Y.update(!AltShift, keySpace, keyEnter,   50, 0, dt) * factPy * -Math.sin(camera.rotation.x)
		adpF+= intPo2F.update(!AltShift, keySpace, keyEnter,   50, 0, dt) * factPy * +Math.cos(camera.rotation.x)

		//    Rotation	X/Y   Extra key, upKey,     downKey,  aUp,aMax
		adrY = intRotY.update( AltShift, keyLeft,  keyRight,    5, 4, dt) * camera.fov/fovDefault
		adrX = intRotX.update( AltShift, keyUp,     keyDown,    5, 4, dt) * camera.fov/fovDefault
	}
  

	if((this.controlMode==2) && (!DevOrConsOn)) { // 1=Inspect   2=SegWay   3=...  sss sss sss
		// Position aus FR wird XZ. Dazu Y  (Forward,Right - X=Quer Z=Vorrück  Y=Höhe)
	//	var slow = 0.1 ;if(keyEsc)  slow = 0 ;
		if(keyLeft || keyRight) speedPosF.slow(dt,10)
		adpF=speedPosF.update(!keyShift, keyDown,     keyUp,          dt) * factPq //ööö
		adpR = intPosR.update( keyShift, keyRight,  keyLeft,   10, 0, dt) * factPy
		adpY+= intPosY.update( keyShift, keyUp,     keyDown,   10, 0, dt) * factPy
		adpY+= intPosY.update(     true, keyPUp,   keyPDown,   50, 0, dt) * factPy

		//    Rotation	X/Y   Extra key, upKey,       upKey,  aUp,aMax
		adrY = intRotY.update(!keyShift, keyLeft,  keyRight,    5, 4, dt) * camera.fov/fovDefault
		adrX = intRotX.update(!keyShift, keySpace, keyEnter,    5, 4, dt) * camera.fov/fovDefault    // früher: Shift Up/Down
		//rZ = intRotZ.update( keyShift, keyEnter, keySpace,    5, 4, dt) // Lieber nicht und dafür Zoom:
	}


	if((this.controlMode==3) && (!DevOrConsOn)) { // 1=Inspect   2=SegWay   3=Plane


        var accDest_, rotDest_
		var difX = 0
		var difY = 0
		var sSpeed = 0

			if(keyLeft ) difX = +900
			if(keyRight) difX = -900
			if(keyUp   ) difY = -10000
			if(keyDown ) difY = +10000
			if(keyPUp  ) sSpeed = +1
			if(keyPDown) sSpeed = -1

			if(PointF) {
				var fakt = 500
				difX  += -PointDH/wMin*fakt
				difY  += +PointDV/wMin*fakt
			}
		
            accDest_ = -difY * 0.01; // Beschleunigung je nach y-Auslenkung  fff
            rotDest_ = -difX * 0.1;   // Drehung je nach x-Auslenkung

		if(gCustom!=2) {
			this.Flight.cycle(dt*1000/*CYC_MOVE*/, rotDest_, accDest_, sSpeed, 0/*gd.yBoden*/);
			var obj = Flight.fObj();
			var wi = obj.rotation.y
			var cd = 22
			camera.position.copy(obj.position)
			camera.position.y +=  5 // m höher
			camera.position.x += cd   * Math.sin(wi)
			camera.position.z += cd   * Math.cos(wi) // m zurück / dahinter
			camera.position.z += cd/8 * Math.sin(wi)
			camera.position.x += cd/8 * Math.cos(wi) // m seitwärts
			camera.rotation.x =  g(-10)
			camera.rotation.y =  obj.rotation.y
			camera.rotation.z =  0
		}
	}


	/** Was war das ??
	if((this.controlMode==3) && (!DevOrConsOn)) {
		adrY = intRotY.update(!keyShift, keyLeft,  keyRight,    5, 8, dt) * camera.fov/fovDefault
		adrX = intRotX.update(!keyShift, keyDown,  keyUp,       5, 8, dt) * camera.fov/fovDefault
	}  **/
	
	WalkPosAd(adpF,adpR)  // Inspect+Segway

	
	fovCam=intRotZ.update( true, key_Z && !keyShift,
								 key_Z &&  keyShift,  10, 0, dt)

		camera.fov -= fovCam // zoom
	if( camera.fov> 120 ) camera.fov=120
	if( camera.fov<0.01 ) camera.fov=0.01  	//log(camera.fov)

	//	if(stereoOn && !keyShift) adpF += -100*dt/2  // EXPERIMENT ONLY!: Kardboard auto walk




	if(this.controlMode==1) { // 1=Inspect    2=SegWay   3=...		

		// Maus/Touch: XY-Twist 1:1 Bewegung  ////////////////////
		var fakt = 160
		if(PointF) {
			if(AltShift) {                   // dreh  RechtsLinksRaufRunter
				rotX  = +PointDV/wMin*2    + rStartX
				rotY  = +PointDH/wMin*2    + rStartY
			} else {	 // Identisch mit XX unten?? // shift RechtsLinksRaufRunter
				posR  = -PointDH/wMin*fakt/5 * (factPy/3) // Laufen schneller je weiter oben
				posF  = -PointDV/wMin*fakt/5 * (factPy/3)
				WalkPosi(posF,posR)
			}
		}

		if(PointS) { // 2-Finger Touch oder 2. Maus
			// Identisch mit XX oben?? //
				rotX  = +PointDV/wMin*2    + rStartX
				rotY  = +PointDH/wMin*2    + rStartY
		}
		
		// ?? Und WIE  shilftVorRück? Mit Spreiz. DoDo

		if(WheelD!=0)	{
		//	if(dbg>1) log("WheelD",WheelD)
			if(AltShift) {
				adpY    +=  WheelD * WheelX * factPy
			} else {
				adpY    +=  WheelD * WheelX * factPy * Math.sin(camera.rotation.x)
				WalkPosAd( -WheelD * 1      * factPy * Math.cos(camera.rotation.x), 0)
			}
		}
		if(PointS)		{
			adpY -=  ( (PointDStart/PointD-1)*5   * Math.sin(camera.rotation.x) )
			WalkPosAd( (PointDStart/PointD-1)*5, 0)		//	vorwärts/r
		}
		
		if(PointT)		{
			posY = pStartY + PointDV/wMin * fakt// * (factPy/3)
			posR =          -PointDH/wMin * fakt// * (factPy/3)
			WalkPosi(0,posR)
		}
		
	} // Inspect
	//log(keyAlt,keyShift)
	

	if(this.controlMode==2) { // 1=Inspect    2=SegWay   3=...		
		//	log(PointDH,posF,pStartX,posX)
	
		// Maus/Touch: NOCH als Einfache 1:1 Bewegung  ////////////////////
		// Aktuelle Veränderung dazu rechen
		var fakt = 50
		if(PointF) {
			if(!keyShift) { //  shiftVorRück & drehRechtsLinks
				posR  = -PointDH/wMin*fakt/10 // ! Zusätzlich zum Rotieren auch ein bischen shiften
				posF  = -PointDV/wMin*fakt/2 * (factPy/1.5) // Laufen schneller je weiter oben
				WalkPosi(posF,posR)
				rotY  = +PointDH/wMin*2    + rStartY
			} else { // Identisch mit XX unten //   drehRaufRuner & shiftRechtLinks
				rotX  = +PointDV/wMin*2    + rStartX 
				posR  = -PointDH/wMin*fakt // ööö
				WalkPosi(0,posR)
			}	
		}// "erster" Zeiger
		
		if(PointS) { // 2-Finger Touch = 1 Finger+Shift
			// Identisch mit XX oben //   
			rotX  = +PointDV/wMin*2    + rStartX
			posR  = -PointDH/wMin*fakt // ööö
			WalkPosi(0,posR)
		}

		if(WheelD!=0) {
			adpY  +=  WheelD * WheelX * factPy
		}
		
	} // SegWay




	if( key_0||key_O)  Reset(true) // home
	if( key_X && hud) {
		key_X = false
		controlMode++ ;if(controlMode>3) controlMode = 1
		switch(controlMode) {	//        dddd
			case 1: hud.Out([	"### Controls in VIEW-Mode",
								"ARROW-KEYS or WASD: slide +SHIFT: turn",
				 				"ENTER/SPACE: distance, +SHIFT: elevate",
								"",
								"MOUSE 1st: side, 2nd: turn, weel: distance"])
								break

			case 2: hud.Out([	"+++Controls in AVATAR-Mode",
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
			
			case 3: hud.Out([	"+++Controls in PLANE-Mode",
								"Will take of and land by speed atomaticly",
							 	"ARROW-KEYS: left/right-turn, ahead/back",
								"",
								"MOUSE/TOUCH: yes, try it!"])
								break
			default: hud.Out([	"+++Controls ILLEGAL-Mode!!!"])
		}
	}
		
	
	//r cx = r(camera.rotation.x);	posY = -cx*4   // Blickwinkel abhängig von Höhe WEG

if(replayI<0) {
			
	if(posX!=0) camera.position.x = posX
	if(posY!=0) camera.position.y = posY
	if(posZ!=0) camera.position.z = posZ
	
	if(rotX!=0) camera.rotation.x = rotX 
	if(rotY!=0) camera.rotation.y = rotY
	if(rotZ!=0) camera.rotation.z = rotZ
	
	camera.rotation.x += adrX;   camera.position.x += adpX  ;pStartX += adpX
	camera.rotation.y += adrY;	 camera.position.y += adpY  ;pStartY += adpY	//	log("33333",camera.position.y,adpY)
	camera.rotation.z += adrZ;   camera.position.z += adpZ  ;pStartZ += adpZ
	
	var y = +1 //  Erst mal nicht unterirdisch !!!! -100
//	if(camera.position.y <  y  ) camera.position.y =  y	


	if( (camera.position.y<=0) && (lastCamY>0) && (controlMode<3) ) {
		alert("Do you realy want to go under ground? Use key 'Page-Up' do go up")
		keyCtrl = keyAlt = keyShift = keyCmd = keyDown = keyPDown = false
	}
	
	// Beim Segway: Augehnhöhe anstreben
	var y =                    camera.position.y - 1.5 // 1.6
	if( Math.abs(y) < 1.0 )    camera.position.y -= y*1*dt

	light.target.position.x = camera.position.x
	light.target.position.z = camera.position.z
//	light.target.position.set( camera.position )


    //ma2.visible = (camera.position.y < 150) 
	//if(camera.position.y < 50) camera.near = 0.05; else camera.near = 0.5
	//mera.near = Math.abs(camera.position.y) / 100 
	// camera.near = factPq/10
	//camera.near = Math.floor(factPq/10)
			
	if(camera.rotation.y > g(360) ) camera.rotation.y-= g(360)
	if(camera.rotation.y < g(  0) ) camera.rotation.y+= g(360)

	var rMax = 89
	if(camera.rotation.x < -g(rMax) ) camera.rotation.x = -g(rMax)
	if(camera.rotation.x > +g(rMax) ) camera.rotation.x = +g(rMax)

	// Kammera- auf/ab-Neigung veringern auf <x Grad
		if( Math.abs(camera.rotation.x) > g(30)) camera.rotation.x *= (1-0.95*dt*  (Math.abs(camera.rotation.x)-g(30)) )

}//kein replay

  //  light.position.set(        camera.position.x-lightX, lightY, camera.position.z-lightZ ) // Wenn die "Sonne" weit weg ist, braucht sie sich nicht mit der Kammera zu bewegen
  //  light.target.position.set( camera.position.x,             0, camera.position.z        )
  //  cameraShadow.position.set( camera.position.x-lightX,      0, camera.position.z-lightZ ) // ??? tut nichts!!!
	if(skyDome) skyDome.position.set(       camera.position.x,             0, camera.position.z        )

	//   x ist "normal"								    z: Grad PLUS = Meter MINUS !! "In den Hintergrund"
	if(  Math.abs(camera.position.x < (lastLoadx ))	||  Math.abs(camera.position.z > (lastLoadz ))
	  || Math.abs(camera.position.x > (lastLoadEx))	||  Math.abs(camera.position.z < (lastLoadEz))
	  || key_M
	   ) {
		/*if(!DevOrConsOn)??*/ {
			
			var lon = camera.Lon()
			var lat = camera.Lat()

			if(key_M && !keyShift) { // SLIPPY-MAP
			//	var url = myURL+"/OSMgoSlippy.html?lat="+lat.toFixed(5)+"&lon="+lon.toFixed(5)
				var url = myURL+"/map?go=1&lat="+lat.toFixed(8)+"&lon="+lon.toFixed(8) + "&user="+userName
				if(stereoOn) url += "&card="+stereoOn
				if(dbg>1) log("Map-url: ",url)
				window.open(              url,"_self")
				key_M = false // do avoid repetation
				return
			}
			
			if(key_M && keyShift) {  // Reload default or with shift only 0
				// "Pausen"-Logo vor 3D-Weld
				if(dbg == 1.5) gOptimize = 0
				if(mLogo) mLogo.visilble = true
				var dir =        r( camera.rotation.y)
				var view=        r( camera.rotation.x)
				var url = myURL+"/index.html"       +   "?lat="+lat.toFixed(8) + "&lon=" + lon.toFixed(8) + "&ele="+camera.position.y.toFixed(2)
													+   "&dir="+dir.toFixed(0) + "&view="+view.toFixed(0) + "&user="+userName
						 							+   "&dbg="+dbg            + "&fps="+hud.fpsMin
						  /*if(controlMode>1)*/	url +=  "&con="+controlMode   
							if( stereoOn  )		url += "&card="+stereoOn
							if( simul     )		url += "&simt="+simul
				if(keyAlt) {
					gOptimize = 0
					if(tileDistMax==0)	url += "&tiles=3"
					else				url += "&tiles=1"
				}
				else         url += "&tiles="+tileDistMax
			    url += ("&opt="+gOptimize)
				if(dbg>1) log("Reload-url: ",url)
				window.open(                         url,"_self")
				key_M = false // do avoid repetation
				return
			}

			osmBuilder.QueryOsmTiles(lon,lat)

		}//DevOrConsOn
	}//key_M

	if( camera.position.y > 500 && dbg != 1.5 ) // ääää
		camera.position.y = 500

	posX = rotX = adpX = adrX = 0;   WheelD = 0
	posY = rotY = adpY = adrY = 0
	posZ = rotZ = adpZ = adrZ = 0
	  
	if(avatar != null) {
		var 
		sc = SinCos(         camera.rotation.y - g( 90), 0.15 )
		s2 = SinCos(         camera.rotation.y - g(180), 0.45 )
		if(stereoOn) { // Cardboard
	   	sc = SinCos(DOcontrols.alphaOffsetAngle- g( 90), 0.15 )
		s2 = SinCos(DOcontrols.alphaOffsetAngle- g(180), 0.45 )
		}
		avatar.rotation.z =  camera.rotation.y + g(180)  // -z?
		avatar.position.set( camera.position.x - sc[0] + s2[0] , 0.5,  // -0.85
							 camera.position.z - sc[1] + s2[1] )
	}
		  
	this.heading = Math.floor(DOcontrols.heading||0) + r(DOcontrols.orient||0) // Grad +1 1    BEI  iOS
	if(this.heading>360) this.heading -= 360 // magnetisch
		
	//// EICHEN der Richtung: Wo war Norden, als das relative Alpha 0 entstand?
	if( DOcontrols.alphaOffsetAngle==0 && heading!=0 && !stereoOn) {
		DOcontrols.updateAlphaOffsetAngle(-g(heading))
		log(heading)
		alert("hhh"+heading)
	}
			
	if(!touchable) this.heading = -r(camera.rotation.y)
	
	if(key_1 && !keyShift) { key_1=false ;cookie_set() } // set/store
	if(key_1 &&  keyShift) { key_1=false ;cookie_get() } // restore

	if( key_L ) {
		key_L = false
		var a = avatars[2] // Teleportiere 50 südlich vom "user"
		camera.position.x = a.position.x
		camera.position.y = a.position.y
		camera.position.z = a.position.z + 50
		camera.rotation.x = 0
		camera.rotation.y = 0
	}


	if( key_N ) {
		key_N = false
		var text = prompt("Place a GO-note:", "");
		if (text) {
		    //log("NOTE:"+text)
			var node = new Node(osmBnode_id,camera.Lat(),camera.Lon())
			node.AddTag("GO-Note",text)
			node.AddTag("From"," you ")
			osmBnode_id++
			node.Place(0)

	        var xmlhttp = new XMLHttpRequest()
				xmlhttp.open("GET", "./xchg.php?note="+userName+";"+camera.Lat()+";"+camera.Lon()+";"+text, true)
	        	xmlhttp.send()
		}
	}


	if( key_C ) {
		key_C = false
		hud.Out([chat3,chat2,chat1,chat0])
		var text = prompt("Chat:", "");
		if (text) {
		    log("CHAT:"+text)

	        var xmlhttp = new XMLHttpRequest()
				xmlhttp.open("GET", "./xchg.php?chat="+userName+":"+text+";#######", true)
	        	xmlhttp.send()
/** /
	    	if( !noLog ) {
		    var xmlhttp = new XMLHttpRequest()
				xmlhttp.open("GET", "http://zi11.ddns.net:3487/web/message?type=3&timeout=3&text=go-Chat:"+text, true)
		    	xmlhttp.send()
			}
/**/
		}
	}

	  
	if(dbg>9) log("goControl update ENDE")	
}} // update Zyklisch





// Zeiger Maus UND Touch  ////////////////////////////////////////////////////////////////  


this.PointStart = function(event) { with(this) {
	PointDH = PointDV = 0
	pStartX = camera.position.x;  rStartX = camera.rotation.x
	pStartY = camera.position.y;  rStartY = camera.rotation.y
	pStartZ = camera.position.z;  rStartZ = camera.rotation.z
	var f = 7 ;if(touchable) f = 5
	PointGlobe =  (PointH > wWidth-wMax/f)
		       && (PointV <        wMax/f)
	DevOrConsOn  = false
	if(dbg>1) log("PointStat "+PointGlobe+" "+PointH+"-"+wWidth+"  "+PointV+"-"+wMax/f)
}}

this.PointEnd   = function(event) { with(this) {
	if(  Math.abs(PointDH) < 4 
	  && Math.abs(PointDV) < 4 ) // Kein Drag, Kick!		
	{	if(dbg>2) log("Klick/Tap",PointDH+"/"+PointDV)
		if(hud&&PointF) hud.Point(PointH,PointV)
	}
	PointGlobe = false
}}



//// Maus ////

this.onContextMenu = function(event) { with(this) {	event.preventDefault() }}

this.onMouseWheel = function(event) { with(this) {
	event.preventDefault();
	WheelD = 0;
	     if (     event.wheelDelta !== undefined )  // WebKit / Opera / Explorer 9
		WheelD =  event.wheelDelta
	else if (     event.detail     !== undefined )  // Firefox
	WheelD = -event.detail
	if(WheelD!=0) {
		if(Math.abs(WheelD)!=1)
			log("Wheel:",WheelD)
		if(WheelD>0) WheelD = +1
		else         WheelD = -1
	}
	DevOrConsOn = false
}}


this.onMouseDown  = function(event) { with(this) {
	if(stereoOn) return
	this.kmt++
	event.preventDefault();  // Verhindere normale Rekation vom Fenster
	event.stopPropagation(); // Stop what?
	// Anfang der Bedienung merken
	PointHStart = PointH = event.pageX
	PointVStart = PointV = event.pageY
	PointStart()
	// Art der Bedienung merken
	switch ( event.button ) { // 0/2/1 = Linke/Rechte/Mittlere-Maustaste = PointFirst/Secoud/Third
		case 0: PointF = true                 ;log("Mouse F:",PointH,PointV) ;break
		case 2: PointS = true ;PointF = false ;log("Mouse S:",PointH,PointV) ;break
		case 1: PointT = true ;PointS = false ;log("Mouse T:",PointH,PointV) ;break
	}
	var show = "default" 
	if(PointF) show = "move"
	if(PointS) show = "pointer"
	document.getElementById("container").style.cursor = show 
}}


this.onMouseMove  = function(event) { with(this) {
	if(stereoOn) return
	// Neue Maus-Position merken
	PointH = event.pageX; PointDH = PointH-PointHStart
	PointV = event.pageY; PointDV = PointV-PointVStart
}}


this.onMouseUp    = function(event) { with(this) {
	if(stereoOn) return
	event.preventDefault();
	event.stopPropagation();
	PointEnd()
	PointF = PointS = PointT = false
	switch ( event.button ) {
		case 0: PointF = PointS = PointT = false ;log("mouse-F:",PointH,PointV) ;break
		case 2:          PointS = PointT = false ;log("mouse-S:",PointH,PointV) ;break
		case 1:                   PointT = false ;log("mouse-T:",PointH,PointV) ;break
	}
	var show = "default" 
	if(PointF) show = "move"
	if(PointS) show = "pointer"
	document.getElementById("container").style.cursor = show 
}}


this.onfokus = function(event) {
	keyUp = keyDown = keyLeft = keyRight = false
}


// KEYBOARD - TASTATUR ////////////////////////////////////////////////////////////////
// Für alle relevante Tasten gibt es eine Zustands-Bool
// Die Reaktion wird anderswo zugeordnet
////// Tastendruck/loslassen
this.onKeyDown = function(event) { this.onKeyX(event.keyCode,true)  ;DevOrConsOn = false;  this.kmt++   ;if(dbg>0) log("KEY+:" + event.keyCode) }
this.onKeyUp   = function(event) { //////////////////////////////////
	this.onKeyX(event.keyCode,false) 
	                                    ;if(dbg>2) log("Key-:" + event.keyCode) }
this.onKeyX    = function(code,down) { with(this) {

	if(        keyAlt &&       keyCmd
	  && code!=keyAlt && code!=keyCmd) {
		keyLeft = keyRight = false
	  	keyAlt  = keyCmd   = false
		return // both are pressed: prozess no other keys, broswer-tab change
	}

	switch (code) {   ////// Tastenänderung

		// Shift is the most critical key. And return instead of break may speed up things
		case 16:  keyShift = down ;return // macOS & Wind
		
		// Also critical								// The other dirction is switched of, to fight missing low-events
		case 65: /*key_A  */ case 37: keyLeft  = down ;keyRight = false ;return
		case 87: /*key_W  */ case 38: keyUp    = down ;keyDown  = false ;return
		case 68: /*key_D  */ case 39: keyRight = down ;keyLeft  = false ;return
		case 83: /*key_S  */ case 40: keyDown  = down ;keyUp    = false ;return
		case 171:/* +     */
		case 187:/* +   ? */
		case 36: /*keyHome*/ case 33: keyPUp   = down ;keyPDown = false ;return // Der gleiche Code kommt auch bei Apple, beim MacAir ohne eigene Tasten als [fn]+Up/Down
		case 198:/* -     */
		case 163:/* #     */
		case 220:/* #   ? */
		case 35: /*keyEnd */ case 34: keyPDown = down ;keyPUp   = false ;return

		case 12:						 // "center" of arrows macOS?? & Wind
		case 13:  keyEnter = down ;return
		case 32:  keySpace = down ;return
		case 17:  keyCtrl  = down ;return // macOS & Wind
		case 18:  keyAlt   = down ;return // macOS & Wind
		case 27:  keyEsc   = down ;return // macOS & Wind
		case 91:  						  // macOS Chrome
		case 224: keyCmd   = down ;return // macOS Firefox

		case 48:  key_0    = down ;break
		case 49:  key_1    = down ;break
		//   51:  key_3 see below!
		//   52:  key_4    = down ;break
		case 57:/*key_9*/    dbg++;break
		//   63:  keyQuestionmark ? see below
		//   65:  key_A    = down ;break = left
		case 66:  key_B    = down ;break
	    case 67:  key_C	   = down ;break
		//   68:  key_D 	 dbg++;break = right
		//   71:  G siehe unten!
		case 72:  /* H */         break

		case 76:  key_L    = down ;break 
		case 77:  key_M	   = down ;break 
		case 78:  key_N	   = down ;break 
		case 79:  key_O    = down ;break 
		case 82:  key_R    = down ;break 
		//se 83:  key_S    = down ;break = down
		//se 87:  key_W    = down ;break = up 
		case 88:  key_X    = down ;break 
		case 90:  key_Z    = down ;break 

		
		/* Einzel-/Toggle-Bediendungen   AUS, nur statisch!
		case 51:  if(down)  // key_3
					{	if(stereoOn==0) stereoOn = 1
						else if(stereoOn==1) stereoOn = 0
						log(stereoOn)
						camera.aspect = wWidth / wHeight
						camera.updateProjectionMatrix()
					}
				  break ****************/

		case 72:  if(!down) { if(hud) hud.DbgOn(0) ;break }  // keyH   On(0) = Toggle
	//	case 71:  if(!down) { window.open(httpx+"osmgo.org","_self")  ;break } // Key "G" for Geo-Locaton / GPS oder Browser Location-Service

		case 63:  // ==>																// Questionmark or Scharfes-ß weil Shift hier egal ist
	    case 112: if(!down) { window.open(httpx+"osmgo.org/info","_blank")  ;break }	// "F1" for Help
		
		default:
			
			hud.Out([	"Keybboard use", // dddd
						"?: Or 'F1' for help",
						"0: Or 'o' for teleport home",
						"X: Switch between View- and Avatar-Mode",
						"B: Blocked Tileload repeat",
						"C: Chat (global)",
						"D: Debuglevel +1",
						"H: Headup Display Info on",
						"N: Node place (global)",
						"S: Set position marker",
						"R: Recall position marker",
						"Z: Zoom in. Shift-Z: Zoom out"])

	}//switch
	//log("key down",code,down)
}} //onKeyX


//// Touch ////


this.onTouchStart = function(event) { with(this) {  /// Touch START ////////////////////
	this.kmt++
	event.preventDefault();
	event.stopPropagation();
	PointF = false;  // erst mal alle aus
	PointS = false;
	PointT = false;
	PointDH = 0
	PointDV = 0
	switch ( event.touches.length ) {  // 1/2/3=1/2/3-Finger-Touch
	case 1: PointF = true;
			// Anfang der Bedienung merken
			PointHStart = PointH = event.touches[ 0 ].pageX
			PointVStart = PointV = event.touches[ 0 ].pageY
			PointStart() ;log("Point F:",PointH,PointV)
		    break; 
	case 2: PointS = true;
	        // Anfang der Bedienung merken: Mittelwert aus 1. und 2. Touch
			PointHStart = PointH = (event.touches[0].pageX+event.touches[1].pageX)/2
			PointVStart = PointV = (event.touches[0].pageY+event.touches[1].pageY)/2
			PointStart() ;log("Point S:",PointH,PointV)
			// DeltaPoint: Abstand der beiden Punkte
			PointDStart = PointD = Phytagoras(	event.touches[0].pageX-event.touches[1].pageX,
												event.touches[0].pageY-event.touches[1].pageY	)
			break
	case 3: PointT = true;
			PointHStart = PointH = event.touches[ 0 ].pageX
			PointVStart = PointV = event.touches[ 0 ].pageY
			PointStart() ;log("Point T:",PointH,PointV)
			break; 
	}
}}

this.onTouchMove  = function(event) { with(this) {  /// Touch MOVE /////////////////////
	if(!PointF&&!PointS&&!PointT) return; // alert("move vor touch kommt vor")
	event.preventDefault();
	event.stopPropagation();
	PointH = event.touches[ 0 ].pageX // Den ersten Touch gibt es immmer
	PointV = event.touches[ 0 ].pageY
	
	if( event.touches.length >=2 ) {  // Zwei-Punkte-Touch
		PointD = Phytagoras(PointH-event.touches[1].pageX,		// DeltaPoint: neuer Abstand der beiden Punkte  äää
							PointV-event.touches[1].pageY)
		PointH =		   (PointH+event.touches[1].pageX)/2    // x,y-Mittelwert aus 1. und 2. Touch
		PointV =		   (PointV+event.touches[1].pageY)/2
	}
	PointDH = PointH-PointHStart
	PointDV = PointV-PointVStart
}}

this.onTouchEnd   = function(event) { with(this) {  /// Touch END //////////////////////
  event.preventDefault();
  event.stopPropagation();
  PointEnd()
  PointF = PointS = PointT = false // ok??
  //this.onTouchCancel()
}}

// Geht nicht
this.onbeforeunload=function(     ) { with(this) {
	alert("onbeforeunload")
	log(  "onbeforeunload")
}}



 {  /// Hier noch ein Stück Konstruktor! Denn erst hier kann eine Mehtode auch aufgerufen werden
	/// Sollen wir gleich ALLES hier her verschieben?
	///////////////////////////////////////////////////////////////////////////////////////////////////

	this.onWindowResize()

	//////// Da die System-Callback keine Klassen kennen, hier je eine Hilfsfuntion, namenlos unsichtbar inline
	window.addEventListener('orientationchange',   function(event){control.onScreenOrientation    (event)}, false)
	window.addEventListener('resize',			   function(event){control.onWindowResize         (event)}, false)
	window.addEventListener('onbeforeunload',      function(     ){control.onbeforeunload         (     )}, false)  // Geht nicht

	window.addEventListener('onfokus',		   	   function(event){control.onFokus                (event)}, false)
	window.addEventListener('onfokusout',		   function(event){control.onFokus                (event)}, false)

	//???w.addEventListener('devicemotion',    	   function(event){control.handleDeviceMotionEvent(event)}, false);
  
	document.addEventListener('keydown',           function(event){control.onKeyDown              (event)}, false);
	document.addEventListener('keyup',             function(event){control.onKeyUp                (event)}, false);  
	if(touchable) {
	document.addEventListener('touchstart',        function(event){control.onTouchStart           (event)}, false);
	document.addEventListener('touchmove',         function(event){control.onTouchMove            (event)}, false);
	document.addEventListener('touchend',          function(event){control.onTouchEnd             (event)}, false);
  //document.addEventListener("touchcancel",       function(event){control.onTouchCancel          (event)}, false); // boddy
	} else {
	document.addEventListener('mousedown',         function(event){control.onMouseDown            (event)}, false);
	document.addEventListener('mousemove',         function(event){control.onMouseMove            (event)}, false);
	document.addEventListener('mouseup',           function(event){control.onMouseUp              (event)}, false);
	document.addEventListener('mousewheel',        function(event){control.onMouseWheel           (event)}, false);	// Non-Firefox
	document.addEventListener('DOMMouseScroll',    function(event){control.onMouseWheel           (event)}, false);	// Firefox
	document.addEventListener('contextmenu',       function(event){control.onContextMenu          (event)}, false); // Contextmenu disable

	}
  
	if(dbg>2) log("goControl ENDE - Constructor")    

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
   if(dbg>0) log(      cookie);
 }

function cookie_get() {

   if( document.cookie.indexOf('OSM_go_posrot')==-1 ) return   // cookie exists?       
        
   var cookie = getCookie('OSM_go_posrot');
   if(dbg>0) log("cookie",cookie);

   var floats = cookie.split(' ');
   camera.position.x = parseFloat( floats[0] ); 
   camera.position.y = parseFloat( floats[1] ); 
   camera.position.z = parseFloat( floats[2] ); 
   camera.rotation.x = parseFloat( floats[3] ); 
   camera.rotation.y = parseFloat( floats[4] ); 
   camera.rotation.z = parseFloat( floats[5] ); 
   camera.updateProjectionMatrix();
 }


function getCookie(cname) {
   var name = cname + "=";
   var ca = document.cookie.split(';');
   for(var i=0; i<ca.length; i++) {
       var c = ca[i];
       while (c.charAt(0)==' ') c = c.substring(1);
       if (c.indexOf(name) != -1) return c.substring(name.length,c.length);
   }
   return "";
 } 





/////////////  DeviceOrientationControls ////////////////////


/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

THREE.DeviceOrientationControls = function( camera ) {

	var scope = this;

	this.camera = camera;
	this.camera.rotation.reorder( "YXZ" );

	this.enabled = true;

	this.deviceOrientation = {};
	this.screenOrientation = 0;

	this.alphaOffsetAngle = 0;
	this.alpha = 0
	this.beta  = 0
	this.gamma = 0

    this.heading = 0 // magnetisch

	var onDeviceOrientationChangeEvent = function( event ) {
		scope.deviceOrientation = event;
	};


	var onScreenOrientationChangeEvent = function() {
		scope.screenOrientation = window.orientation || 0;
	};


	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

	var setCameraQuaternion = function() {

		var zee   = new THREE.Vector3( 0, 0, 1 );
		var euler = new THREE.Euler();
		var q0    = new THREE.Quaternion();
		var q1    = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

		return function( quaternion, alpha, beta, gamma, orient ) {
			euler.set( beta, alpha, - gamma, 'YXZ' ); // 'ZXY' for the device, but 'YXZ' for us
			quaternion.setFromEuler( euler ); // orient the device
			quaternion.multiply( q1 ); // camera looks out the back of the device, not the top
			quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) ); // adjust for screen orientation
		}

	}();


	this.connect = function() {
		onScreenOrientationChangeEvent(); // run once on load
		window.addEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.addEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );
		scope.enabled = true;
	};


	this.disconnect = function() {
		window.removeEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
		window.removeEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );
		scope.enabled = false;
	};


	this.update = function() {
		if ( scope.enabled === false ) return;

        this.heading = scope.deviceOrientation.webkitCompassHeading ? scope.deviceOrientation.webkitCompassHeading : 0; // Magnetisch

		var alpha  =(scope.deviceOrientation.alpha ? g( scope.deviceOrientation.alpha ) : 0) + this.alphaOffsetAngle; // Z   Offset magnetisch oder Segway
		var beta   = scope.deviceOrientation.beta  ? g( scope.deviceOrientation.beta  ) : g(90+5); // X'
		var gamma  = scope.deviceOrientation.gamma ? g( scope.deviceOrientation.gamma ) : 0; // Y''
		var orient = scope.screenOrientation       ? g( scope.screenOrientation       ) : 0; // O


		setCameraQuaternion( scope.camera.quaternion, alpha, beta, gamma, orient );
		this.beta  = beta;
		this.gamma = gamma;
		this.alpha = alpha;

		// alert("aaa: "+ alpha +" ! "                        +scope.deviceOrientation.alpha + " ! " + this.alphaOffsetAngle )

	};


	this.updateAlphaOffsetAngle = function( angle ) {
		this.alphaOffsetAngle = angle;
		this.update();
		alert("xxx"+angle)
	};


	this.dispose = function() {
		this.disconnect();
	};


	this.connect();

};



function getGeolocation(location) {
  //alert("TEST: Android-Gerät mit GPS aus aum Bowser stellt keine Frage und kommt nie hier her");  return
  teststr = "getGeolocation"
  ////// https://developer.mozilla.org/de/docs/Web/WebAPI/verwenden_von_geolocation
  latitude  = location.coords.latitude 
  longitude = location.coords.longitude
  accuracy  = location.coords.accuracy
  if(accuracy<accuOld) {  // Nullpunkt = bei besserem GPS-Wert 
    accuOld=accuracy
    lat0 = latitude
    lon0 = longitude
    // alert(lat0,lon0)
  } 
  if(gpsAct && lat0!=0 && gpsOn) {
     gpsAct.position.x = +GetLon2x(longitude,latitude);
     gpsAct.position.z = +GetLat2z(latitude);
    //log(lon,lat,posX,posZ)
  }
  if(lat0!=0 && gpsOn && DevOrConsOn) {
     camera.position.x = +GetLon2x(longitude,latitude);
     camera.position.z = +GetLat2z(latitude);
    //log(lon,lat,posX,posZ)
  }
  
  if(navigator.platform=="MacIntel") return
  if(navigator.platform=="Win32")    return

	if( !navigator.geolocation.watchPosition)
         navigator.geolocation.getCurrentPosition(getGeolocation)
}




// building:part OHNE relation = immer darestellen?  relation=644901 (weg editiert)





//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////





//-----------------------------------------------------------------------------
/** w3dFlight.js - Bewegungssteuerung fuer fliegende Objekte        2017-11-03
 */

var FlightObject = function() {      // als Objekt geklammert

  var flightObj;                        // das zu steuernde Mesh-Objekt
  var velCur;                           // akt. Geschwindigkeit
  var accCur;                           // akt. Beschleunigung
  var fSide = 0;
  var fHei  = 0;

//-----------------------------------------------------------------------------

  return {

//-----------------------------------------------------------------------------
/** Initialisierung
 * 
 *
 * obj - das Mesh-Objekt, das gesteuert werden soll
 */
    init: function(obj) {

        this.flightObj = obj;
        this.velCur = 0;
        this.accCur = 0;
		this.y2v    = 1;
    },

    fObj: function() {
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
    cycle: function(dt, sSide, sHei, sSpeed, yBoden) { with(this) {

        var VEL_LIFT  = 15.0 * 0.278;   // Geschw. zum Abheben in m/s
        var ACC_LIMIT = 9.5;            // Grenze der Beschleunigung  1.5
        var ROT_LIMIT = 25.0;           // Grenze der Drehgeschwindigkeit

		if(dt>100) dt = 100

        var obj  = this.flightObj;
        var posX = obj.position.x;
        var posY = obj.position.y;
        var posZ = obj.position.z;
        var rotX = obj.rotation.x * 180/Math.PI;
        var rotY = obj.rotation.y * 180/Math.PI;
        var rotZ = obj.rotation.z * 180/Math.PI;

		var dSide = sSide-fSide
		var dHei  = sHei -fHei
		var mSide = 0.5 * dt
		var mHei  = 0.5 * dt

		if(dSide>0) { if(dSide>+mSide) dSide = +mSide }
		else        { if(dSide<-mSide) dSide = -mSide }
		if(dHei >0) { if(dHei >+mHei ) dHei  = +mHei  }
		else        { if(dHei <-mHei ) dHei  = -mHei  }
		
		fSide += dSide
		fHei  += dHei

		if(sSpeed)
			this.y2v *= (1 + 1*sSpeed*dt/1000)

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
        this.velCur +=            this.accCur  * dt * 0.004;

        var velMax = VEL_LIFT + 2.0 + posY * this.y2v  * 0.26;
        if (this.velCur < 0)
            this.velCur = 0; else 
		if (this.velCur > velMax)
            this.velCur = velMax; else
		if ((posY > yBoden) && (this.velCur < VEL_LIFT+1.0))
            this.velCur = VEL_LIFT+1.0;
        if (this.velCur > VEL_LIFT)
			posY += this.accCur * dt * (posY+3) * this.y2v * 0.00005;

        var rxDest = 0;
        var rzDest = 0;
        if (posY <= yBoden + 0.0001) { // am Boden ?
            posY =  yBoden;    // nicht abtauchen
            this.velCur -= this.velCur * dt * 0.004;    // Rollwiderstand
        } else {                // in der Luft
            rxDest = this.accCur // karl * 8.0 - posY*0.1;
            rzDest = -rotDest * 1.5;
        }
        rotX += (rxDest - rotX) * dt * 0.006;
        rotZ += (rzDest - rotZ) * dt * 0.001;
        rotY += rotZ * dt * 0.002; // Blickrichtung integrierend fff

        // Bewegungsrichtung, Winkel
        var wi = rotY * Math.PI / 180;
        var dxMove = Math.sin(wi);      // Anteil 0 bis 1 je Richtung X/Z
        var dzMove = Math.cos(wi);

        // s = v * t, Wegstrecke in diesem Zyklus
        var dWeg = this.velCur * dt * 0.001;

        // Vorwaertsbewegung integrieren
        posX -= dxMove*dWeg;
        posZ -= dzMove*dWeg;

        obj.position.set(posX, posY, posZ);
        obj.rotation.set(rotX * Math.PI/180, rotY * Math.PI/180, rotZ * Math.PI/180);


    }}

  };    // Ende return{}
};      // Ende FlightObject()
