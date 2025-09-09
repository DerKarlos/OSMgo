// Roof.js

PlaceRoof = function (way, height, points, materialX, min_height) { // Render function /// bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb

	var shape = new THREE.Shape(points)
	var roofLevels = false


	if (!(roofShape = way.GetTag("roof:shape"))
		&& !(roofShape = way.GetTag("building:roof:shape"))
	) {
		//var small = Math.sqrt( shape.getLength() )  < 10
		//if(!small)
		return 0
		//roofShape = "gabled"
	}

	var maxx = maxz = -1e9
	var minx = minz = +1e9
	for (var i in points) {
		maxx = Math.max(maxx, points[i].x)
		maxz = Math.max(maxz, points[i].y)
		minx = Math.min(minx, points[i].x)
		minz = Math.min(minz, points[i].y)
	}
	var x0 = (minx + maxx) / 2   // Mittelpunkt Meter-absolut
	var z0 = (minz + maxz) / 2

	var roofHeight = way.GetTag("roof:height", 0) * 1
	//var heightPar = height

	if (roofHeight == 0) {
		roofHeight = way.GetTag("roof:levels", 0) * levelHeight
		if (roofHeight != 0) {
			height += roofHeight
			roofLevels = true
		}
	}

	var across = way.GetTag("roof:orientation") == "across"

	if (roofHeight > height) roofHeight = height

	switch (roofShape) {
		case "flat": /////////////////////////////////////////// fff
			return undefined  // default

		case "pyramidal": ////////////////////////////////////// ppp
			// log("roof:shape/height",roofShape,roofHeight)
			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 2
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			var p = 0
			var geometry = new THREE.Geometry()
			geometry.vertices.push(new THREE.Vector3(0, 0, 0)) // zerro.point at the upper dip     // Meter-relativ
			for (p in points) {
				geometry.vertices.push(new THREE.Vector3(points[p].x - x0, -roofHeight,
					points[p].y - z0))    // Meter-relaitv
				if (p * 1 > 0) geometry.faces.push(new THREE.Face3(0, p * 1, p * 1 + 1))
			}   //      geometry.faces.push( new THREE.Face3( 0, p*1, p*1+1 ) )
			geometry.computeFaceNormals();   // Flächenfarbe einrichten
			//geometry.computeVertexNormals(); // Farbübergänge weich
			geometry.mergeVertices()         // Nach V.Normals ist das ok :-)
			var material = materialX[0]
			if (roofLevels) roofHeight = 0 // Wenn die Dachhöhe in Level ist, kommt das Dach Über, nicht ins Haus

			assignUVs(geometry)
			break



		case "dome": ///////////////////////////////////////////// ddd
			// log("roof:shape/height",roofShape,roofHeight)
			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 2
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			var geometry = new THREE.Geometry()
			var v = 0 // verticle counter
			var c = 6 // count of rings from 0 to 90 degrees
			var p = 0
			for (p in points) { // all points of a ring
				// calculate angel center to side-point
				var x = (points[p].x - x0)
				var z = (points[p].y - z0)
				for (var a = 0; a <= 90; a += (90 / c)) {// all angles
					var sc = SinCos(g(a))
					geometry.vertices.push(new THREE.Vector3(x * sc[1], -roofHeight * (1 - sc[0]), z * sc[1])); v++
					if (p > 0 && a > 0) {
						geometry.faces.push(new THREE.Face3(v - 1, v - 0 - 2, v - c - 2))
						geometry.faces.push(new THREE.Face3(v - 2, v - c - 2, v - c - 3))
					}
				}  // a
			} // p
			var material = materialX[1]
			if (roofLevels) roofHeight = 0 // Wenn die Dachhöhe in Level ist, kommt das Dach Über, nicht ins Haus

			assignUVs(geometry)
			break


		case "onion":
			// log("roof:shape/height",roofShape,roofHeight)

			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 2
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			var Kurve = [ //  // |y|  -x-   The curve is about "taken" frim F4map.com 
				[1.00, 0.00],
				[1.12, 0.09],
				[1.27, 0.15],
				[1.36, 0.27],
				[1.28, 0.42],
				[1.10, 0.51],
				[0.95, 0.53],
				[0.62, 0.58],
				[0.49, 0.61],
				[0.21, 0.69],
				[0.10, 0.79],
				[0.00, 1.00]];
			var v = -2;
			var geometry = new THREE.Geometry()

			for (p in points) { // all points of a ring => columns
				if (p == 0) continue // first point is used with the second only
				// calculate angel center to side-point
				var x1 = (points[p - 1].x - x0)
				var z1 = (points[p - 1].y - z0)
				var x2 = (points[p - 0].x - x0)
				var z2 = (points[p - 0].y - z0)
				//			for (var s = 0; s < (Segmente); s++) { // columns
				// geometry.vertices.push(new THREE.Vector3(0, - roofHeight, 0), new THREE.Vector3(0, - roofHeight, 0)); v += 2; // vertices 0 und 1: Die unteren? Punkte des Kugel-Segments sind beide 0,0
				//				var a1 = g(360) / Segmente * (s + 0.5);   // Winkel der Rechten/Linken Kante
				//				var a2 = g(360) / Segmente * (s - 0.5);

				for (var i in Kurve) { // column faces (rings)
					var xz = Kurve[i][0];  // radius
					var yy = Kurve[i][1] * roofHeight - roofHeight;  	 // height
					// calc and push x positions
					//					var sc1 = SinCos(a1, x);
					//					var sc2 = SinCos(a2, x);
					geometry.vertices.push(new THREE.Vector3(x1 * xz, yy, z1 * xz));
					geometry.vertices.push(new THREE.Vector3(x2 * xz, yy, z2 * xz));
					if (i > 0) {
						// push 2 triangles = 1 "face"
						geometry.faces.push(new THREE.Face3(v + 0, v + 2, v + 1));
						geometry.faces.push(new THREE.Face3(v + 1, v + 2, v + 3));
					}
					v += 2; // log("face:",i,Kurve.length)
				}  // i
			} // s
			// https://osmgo.org/go.html?km=1&lat=48.57285071&lon=13.46572687&ele=57.26&dir=360&view=-10&user=lower%20saxony&dbg=1&con=1&tiles=4&opt=2
			var material = materialX[1]
			if (roofLevels) roofHeight = 0 // Wenn die Dachhöhe in Level ist, kommt das Dach Über, nicht ins Haus

			assignUVs(geometry)
			break




		case "skillion": //// Roof will replace the whole building!
			//log("roof skillion id: ",way.id)
			// Hier wird das genze Gebäude samt Dach erzeugt! Erst als Flachdach, dann eine Kante abgesenkt. Es entsteht eine Schräge

			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 10
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			var m = new THREE.Matrix4()
			var geometry = new THREE.ExtrudeGeometry(shape, { depth: height/*-min_height*/, bevelEnabled: false })
			geometry.applyMatrix(m.makeRotationX(g(90)))
			x0 = z0 = 0 // ist schon Meter-Absolut

			// ... dann werden die Wände gesenkt - sehr getrixt!
			// log("id points 0 1 x y:",way.id,points[0].x,points[0].y,points[1].x,points[1].y)
			var b = longestSideAngle(points)

			/***
			var maxs = 0
			var b  // Scan vor the longest wall
			for (var i = 0; i < points.length - 1; i++) {
				var x = (points[i].x - points[i + 1].x)
				var z = (points[i].y - points[i + 1].y)
				var s = Phytagoras(x, z)
				if (maxs < s) {
					maxs = s
					b = Math.atan2(x, z) - g(180)   //;log("id x,z,r b",way.id, x,z,r(b)) // Angle of building
				}
			}
			***/

			if (across)
				b += g(90)

			var d = way.GetTag("roof:slope:direction")
			if (d) b = g(90 - d)
			var d = way.GetTag("roof:direction")
			if (d) b = g(90 - d)

			if (b > g(360)) b -= g(360)
			if (b < g(0)) b += g(360)

			geometry.applyMatrix(m.makeRotationY(-b))

			var maxx = -1e9  // Höchste und niedrigste Stelle ermitteln
			var minx = +1e9
			for (var i = 0; i < geometry.vertices.length / 2; i++) {
				maxx = Math.max(maxx, geometry.vertices[i].x)
				minx = Math.min(minx, geometry.vertices[i].x)
			}
			var dm = roofHeight / (maxx - minx) // Höhen/Tiefe der Nodes/Ecken berechenen
			var v2 = geometry.vertices.length / 2
			for (var i = 0; i < v2; i++) {
				var h3 = (geometry.vertices[i].x - minx) * dm
				geometry.vertices[i].y = -h3
				//	geometry.vertices[i+v2].y = -(height-min_height)
			}

			geometry.applyMatrix(m.makeRotationY(+b))


			var material = materialX; if (THREE.REVISION <= 83)
				material = new THREE.MultiMaterial(materialX)
			roofHeight = height // Damit nur die roof-geometry erscheint
			break





		// Using an ExtrudeGeometry like for skillion is nice but gets odd when nodes need to be added.
		// Let's kreate the Geometry manually. It's about like flat the points gets edges at min_heigt and heigt
		// But then, the height gets changed according to the roof shape.
		case "gabledäää": // äää
			if (way.id != 155988350) return 0 // 127669807
			// 155988350! =>  https://overpass-turbo.eu/s/1Zb1
			// https://osmgo.org/go???.html?km=1&lat=48.56925753&lon=13.45360588&ele=19.79&dir=360&view=-12&user=bavaria&dbg=1&con=1&tiles=4&opt=2
			// https://www.openstreetmap.org/way/155988350#map=19/48.569962/13.453759&layers=N
			// https://beakerboy.github.io/OSMBuilding/index.html?type=way&id=155988350

			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 3
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			/**
			var geometry = new THREE.Geometry();
			var v = 0
			for (var pointIndex in points) {
				if (pointIndex == 0) continue
				var point1 = points[pointIndex - 1]
				var point2 = points[pointIndex - 0]

				geometry.vertices.push(new THREE.Vector3(point1.x, 0.00000000, point1.y));
				geometry.vertices.push(new THREE.Vector3(point2.x, roofHeight, point2.y));
				geometry.faces.push(new THREE.Face3(v + 0, v + 2, v + 1));
				geometry.faces.push(new THREE.Face3(v + 1, v + 2, v + 3));
			}
			// geometry.computeFaceNormals();
			assignUVs(geometry)
			**/

			var b = longestSideAngle(points)
			if (across)
				b += g(90)

			var d = way.GetTag("roof:slope:direction")
			if (d) b = g(90 - d)
			var d = way.GetTag("roof:direction")
			if (d) b = g(90 - d)

			if (b > g(360)) b -= g(360)
			if (b < g(0)) b += g(360)

			var options = {
				center: [x0, z0], //center,
				angle: -b, //angle,  ttt
				depth: roofHeight, // this.options.roof.height,
			};

			// geometry = new THREE.ExtrudeGeometry(shape, { depth: height - roofHeight - min_height, bevelEnabled: false })

			//prev = ear.prev;
			//next = ear.next;   tree 173

			var shape = new THREE.Shape(points)
			var geometry = new WedgeGeometry(shape, options);
			assignUVs(geometry)

			roofHeight = height // Damit nur die roof-geometry erscheint
			x0 = z0 = 0 // ist schon Meter-Absolut (äh?)
			break // gabled




		//	-17.99, 0.00
		//	-17.98, 9.06
		//	+17.99, 9.05
		//	+17.99, 0.00



		// https://cdn.jsdelivr.net/npm/polybooljs@1.2.0/dist/polybool.min.js"
		// file:///Users/Karl/Dropbox/OSMgo/act/go.html?lat=49.71373&lon=11.08986&ele=32.75&dir=312&view=-35&user=karlos&tiles=1

		case "gabledXXX":

			// if(way.id!=442474125) return
			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 3
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			var m = new THREE.Matrix4()
			var geometry = new THREE.ExtrudeGeometry(shape, { depth: height/*-min_height*/, bevelEnabled: false })
			geometry.applyMatrix(m.makeRotationX(g(90)))

			var revert = points[1].x != geometry.vertices[1].x
				|| points[1].y != geometry.vertices[1].z

			// ... dann werden die Wände gesenkt - sehr getrixt!
			// log("id points 0 1 x y:",way.id,points[0].x,points[0].y,points[1].x,points[1].y)

			var maxs = 0
			var b  // Scan vor the longest wall

			// Richtung des Dachfirsts erkennen
			for (var i = 0; i < points.length - 1; i++) {
				var x = (points[i].x - points[i + 1].x)
				var z = (points[i].y - points[i + 1].y)
				var s = Phytagoras(x, z)
				if (maxs < s) {
					maxs = s
					b = Math.atan2(x, z) - g(180)   //;log("id x,z,r b",way.id, x,z,r(b)) // Angle of building
					j = i
				}
			}

			if (across)
				b += g(90)

			var d = way.GetTag("roof:slope:direction")
			if (d) b = g(90 - d)

			//log("roof gabled id: ", way.id, r(b) )

			while (b < 0) b += g(180)

			// Drehen um die Firstpunkte zu finden
			geometry.applyMatrix(m.makeRotationY(-b))

			var maxx = maxz = -1e9  // Höchste und niedrigste Stelle ermitteln
			var minx = minz = +1e9
			for (var i = 0; i < geometry.vertices.length / 2; i++) {
				maxx = Math.max(maxx, geometry.vertices[i].x)
				minx = Math.min(minx, geometry.vertices[i].x)
				maxz = Math.max(maxz, geometry.vertices[i].z)
				minz = Math.min(minz, geometry.vertices[i].z)
			}
			var midx = (maxx - minx) / 2 + minx  // Giebelposition!
			var midz = (maxz - minz) / 2 + minz

			// Welche Wand ist unterm Gibel und wo?
			var l2 = geometry.vertices.length / 2
			for (var i = 0; i < l2; i++) {
				var x0 = geometry.vertices[i + 0].x
				var x1 = geometry.vertices[i + 1].x
				var z0 = geometry.vertices[i + 0].z
				var z1 = geometry.vertices[i + 1].z

				if (Math.sign(x0 - midx)
					!= Math.sign(x1 - midx)
				) { // Drunter!
					var fakt = (x1 - x0) / ((x1 - x0) / 2 - x0) // Faktor für Anteil zur ersten Node (vorzeichenrelevant!)
					var difz = Math.abs(z0 - z1)	 // Wandecken-Abstand Z
					var zFir = difz * fakt + z0 	 // Erste-First-Abstand z + Erste = First z am Kreuzungspunkt
					//					if(zFir>midz) zFir*=1.01
					//					else          zFir*=0.99
					// points.splice(i+1+inserts, 0, new THREE.Vector2(midx,zFir)) // First-Point in die mitte einfügen
					var v = new THREE.Vector3(midx, 0, zFir); v.index = i + 1 // Index in Punktearray merken
					geometry.vertices.push(v)  // Punkte hinten dazu damit sie auch zurück gedreht werden
				}//drunter!
			}//for
			geometry.applyMatrix(m.makeRotationY(+b))
			// Neue Punkte einbauen (von hinten)
			if (revert) points.reverse()
			do {
				var v = geometry.vertices.pop()
				if (v.index) {
					var p = new THREE.Vector2(v.x, v.z)
					points.splice(v.index, 0, p) // First-Point in die mitte einfügen
				}
			} while (v.index)
			if (revert) points.reverse()

			// Die Hausecken sind jetzt auch beim First. Extrude neu anlegen und drehen
			shape = new THREE.Shape(points)
			geometry = new THREE.ExtrudeGeometry(shape, { depth: height/*-min_height*/, bevelEnabled: false })
			geometry.applyMatrix(m.makeRotationX(g(90)))
			geometry.applyMatrix(m.makeRotationY(-b))

			var dm = roofHeight / (midx - minx) // Höhen/Tiefe der Nodes/Ecken berechenen
			for (var i = 0; i < geometry.vertices.length / 2; i++) {
				var h3 = Math.abs(geometry.vertices[i].x - midx) * dm
				geometry.vertices[i].y = -h3
			}

			geometry.applyMatrix(m.makeRotationY(+b))

			geometry.verticesNeedUpdate
			//geometry.elementsNeedUpdate



			var material = materialX; if (THREE.REVISION <= 83)
				material = new THREE.MultiMaterial(materialX)
			roofHeight = height // Damit nur die roof-geometry erscheint
			x0 = z0 = 0 // ist schon Meter-Absolut
			//  if(roofLevels) roofHeight = heightPar // Originalwert, damit unten 0 extruded wird

			break // gabledxxx








		default:
			// log("Rooftype not supported! shape/height: ",roofShape,roofHeight)
			return 0
	}

	if (typeof geometry.faces !== "undefined") {
		if (geometry.faces.length != geometry.faceVertexUvs[0].length)
			alert("mist vertex roof")
	}


	var mesh = new THREE.Mesh(geometry, material)
	mesh.position.x = x0 // Meter-absolut
	mesh.position.z = z0
	mesh.position.y = height // Über Building-Haupttteil
	mesh.castShadow = mesh.receiveShadow = shadow
	mesh.osm = way
	mesh.roofHeight = roofHeight

	return mesh
}




/////////////////////////////////



function assignUVs(geometry) {

	geometry.faceVertexUvs[0] = [];

	geometry.faces.forEach(function (face) {

		var components = ['x', 'y', 'z'].sort(function (a, b) {
			return Math.abs(face.normal[a]) > Math.abs(face.normal[b]);
		});

		var v1 = geometry.vertices[face.a];
		var v2 = geometry.vertices[face.b];
		var v3 = geometry.vertices[face.c];

		geometry.faceVertexUvs[0].push([
			new THREE.Vector2(v1[components[0]], v1[components[1]]),
			new THREE.Vector2(v2[components[0]], v2[components[1]]),
			new THREE.Vector2(v3[components[0]], v3[components[1]])
		]);

	});

	geometry.uvsNeedUpdate = true;
}





//////////////////////////// https://github.com/Beakerboy/OSMBuilding

/** 
 * Calculate the angle of the longest side of a shape with 90° vertices.
 * is begining / end duplicated?
 */
function longestSideAngle(points) {
	//st vecs = shape.extractPoints().shape;
	const lengths = edgeLength(points);
	const directions = edgeDirection(points);
	var index;
	var maxLength = 0;
	for (let i = 0; i < lengths.length; i++) {
		if (lengths[i] > maxLength) {
			index = i;
			maxLength = lengths[i];
		}
	}
	var angle = directions[index];
	var extents = calc_extents(points, -angle);
	// If the shape is taller than it is wide after rotation, we are off by 90 degrees.
	if ((extents[3] - extents[1]) > (extents[2] - extents[0])) {
		angle = angle > 0 ? angle - Math.PI / 2 : angle + Math.PI / 2;
	}
	return angle;
}


/**
 * Calculate the length of each of a shape's edge
 */
function edgeLength(points) {
	//nst points = shape.extractPoints().shape;
	const lengths = [];
	var p1;
	var p2;
	for (let i = 0; i < points.length - 1; i++) {
		p1 = points[i];
		p2 = points[i + 1];
		lengths.push(Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2));
	}
	return lengths;
}


/**
 * Calculate the angle of each of a shape's edge.
 * the angle will be PI > x >= -PI
 */
function edgeDirection(points) {
	//const points = shape.extractPoints().shape;
	points.push(points[0]);
	const angles = [];
	var p1;
	var p2;
	for (let i = 0; i < points.length - 1; i++) {
		p1 = points[i];
		p2 = points[i + 1];
		let angle = Math.atan2((p2.y - p1.y), (p2.x - p1.x));
		if (angle >= Math.PI / 2) {
			angle -= Math.PI;
		} else if (angle < -Math.PI / 2) {
			angle += Math.PI;
		}
		angles.push(angle);
	}
	return angles;
}



/**
 * Calculate the Cartesian extents of the shape after rotaing couterclockwise by a given angle.
 */
function calc_extents(points, angle = 0) {  // TEST_ONLY
	var x = [];
	var y = [];
	var vec;
	for (let i = 0; i < points.length; i++) {
		vec = points[i];
		x.push(vec.x * Math.cos(angle) - vec.y * Math.sin(angle));
		y.push(vec.x * Math.sin(angle) + vec.y * Math.cos(angle));
	}
	const left = Math.min(...x);
	const bottom = Math.min(...y);
	const right = Math.max(...x);
	const top = Math.max(...y);
	return [left, bottom, right, top];
}
