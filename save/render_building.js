// Roof.js => render_building.js
import * as THREE from 'three';
import { defHeight, log, mlm, shadow, gOptimize, g, posX0, posZ0, err, dbgOsmID, dbgReturn, dbgRange } from './main.js';
import { Phytagoras, SinCos } from './controls.js'
import { add2Tile, add2TileG } from './osm.js'
import { levelHeight, FilterType, FilterMaterial, partView } from './render.js'
import { llPos, Way, inc_buildingParts, ColourMaterial } from './render_way.js';
import { nodes } from './render_node.js'
import { WedgeGeometry } from './WedgeGeometry.js'

export function DummyToSetBuilding() { } // log("render building dummy") }

Way.prototype.Building = function (material, roofMat) { // Render function /// bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb

	if (this.id == dbgOsmID)
		log("Building:", this.id) // (ggf. dbg-)return
	else if (dbgReturn) return

	if (!roofMat) roofMat = material

	var building = this.GetTag("building")
	var part = this.GetTag("building:part"); if (part == "no") { part = false; if (partView > 0) return }
	if (part) { inc_buildingParts() /*err("Way Multipolygon way WITH building:part "+this.id)*/; if (partView < 0) return }

	var mesh = undefined

	var height = defHeight
	var points = []
	var last = undefined
	var partCount = 0
	var partWay = 0
	var min_height = 0
	var roofHeight = 0
	//log("this",this.wayNodes)

	if (this.wayNodes.length < 4) {  // Minimum First=Last Node = 2 + 2 more
		err("Building with less than 3 Nodes! Way-ID:" + this.id, this); return
	}

	var partMax = this.wayNodes.length * 0.4  // 50%
	for (var n in this.wayNodes) { // Jede Node ..
		var node = nodes[this.wayNodes[n]]
		points.push(new THREE.Vector2(node.x, node.z))

		if (last)
			if (node.x == last.x && node.z == last.z)
				err("way ID" + this.id + ": position node " + (n - 1) + "=" + n, this) /// todo: Multi-Rel merge nicht doppel-Node-Refs !!!
		last = node

		if (n == 0) continue // first skip, is = last
		if (node.partWay) {
			partCount++
			if (partWay == 0)
				partWay = node.partWay
			else if ((partWay != 1) && (partWay != node.partWay))
				partWay = 1 // Zwo different Parts: hide Building is ok
		}

		// if a building node is also a part nodes: don't place the (outer) building. Raw??
		if ((partCount > partMax || partCount > 6) && partWay == 1 && !part && partView > 0)  // partCount>10??
			return
		if (node.GetTag("entrance")
			|| node.GetTag("addr:housenumber")
			|| node.GetTag("shop")
			|| node.GetTag("office")
			//|| node.GetTag("amenity")   always ok?? not if "wast_basked"
		) {
			node.Entrance(this.AngleAtNode(n))
		}//if Tag

	}//wayNodes

	var shape = new THREE.Shape(points)
	var sArea = Math.abs(THREE.ShapeUtils.area(points))
	if (typeof this.holes !== 'undefined') {
		shape.holes = this.holes
		/**	for(h in shape.holes) {
				var hShape = shape.holes[h]
				var hPoints = hShape.points.extractPoints() ? https://threejs.org/docs/#api/extras/core/Curve.getPoints
				var hArea = Math.abs( THREE.ShapeUtils.area( hPoints ) )
				sArea -= hArea
			} **/
	}
	sArea /= 4

	if (defHeight != 0)
		height = defHeight
	else {
		height = Math.sqrt(sArea /*shape.getLength()*/)
		if (height > 16) { // "Grösser" als XXm? langsamm zurück auf 3*h
			height = 2 * 16 - height
			if (height < 3 * levelHeight)
				height = 3 * levelHeight
		}
	}

	var tagLevels
	var tagLevelm
	var tagHeight
	// There is always a level 0 = ground floor (first floor in the US?)
	if (tagLevels = this.GetTag("building:levels", false, true) * 1) { height = tagLevels * levelHeight; } // Above ground, mostly positiv           1 *3 = +3m
	if (tagLevels = this.GetTag(/*******/"levels", false, true) * 1) { height = tagLevels * levelHeight; } // not dokumented but used
	if (tagLevels = this.GetTag("building:max_level", false, true) * 1) { height = (tagLevels + 1) * levelHeight; } // Example: only ground floor =>  0 => (0+1)*3 = +3m height
	if (tagLevelm = this.GetTag("building:min_level", false, true) * 1) min_height = tagLevelm * levelHeight // may be negativ  one cellar => -1 =>   -1 *3 = -3m dept
	if (tagLevelm = this.GetTag("min_level", false, true) * 1) min_height = tagLevelm * levelHeight // may be negativ  one cellar => -1 =>   -1 *3 = -3m dept
	// absolut values overrool level couts
	if (tagHeight = this.GetTag(/***********/"height", false, true) * 1) { height = tagHeight * 1; }
	if (tagHeight = this.GetTag("building:height", false, true) * 1) { height = tagHeight * 1; }
	if (tagHeight = this.GetTag("min_height", false, true) * 1) min_height = tagHeight * 1
	if (tagHeight = this.GetTag("building:min_height", false, true) * 1) min_height = tagHeight * 1

	var roofHeight = this.GetTag("roof:height", 0) * 1

	if (roofHeight == 0) {
		roofHeight = this.GetTag("roof:levels", 0) * levelHeight
		if (roofHeight != 0) {
			height += roofHeight
		}
	}

	if (height < min_height)
		height += min_height // Not correct but understandable

	if (llPos < 0 || this.GetTag("indoor")) {
		height = levelHeight * 0.8
		material = roofMat = mlm.buildingIndoor
	}

	var level
	if (
		(level = this.GetTag("level", false, true))
		&&
		(!this.GetTag("min_height", false, true))
	) { // The Building is "Flying in the air" hopefully on an area with the same level if there is no minimum level
		min_height += (level * 1 * levelHeight)
		height += (level * 1 * levelHeight)
	}
	if ((llPos < 0) && (!this.GetTag("min_height", false, true))) {
		min_height += llPos
		height += llPos
	}

	if (this.GetTag(this.typeMain) == "roof") {
		height = levelHeight // A roof is usually NOT liftet up if it is large but always first/0 level
		min_height = height - levelHeight * 0.2
	}

	if (height <= (4 * levelHeight) && sArea < 400 && !part && roofMat == mlm.building)
		roofMat = mlm.buildingRoof

	var col
	if (col = this.GetTag("building:colour")) {
		material = ColourMaterial(col, 1, this, true)
	}

	if (col = this.GetTag("roof:colour")) {
		roofMat = ColourMaterial(col, 2, this, true)
	}


	if (FilterType > 1 && this.filter) {
		material = FilterMaterial
		roofMat = FilterMaterial
	}

	var mat0X = [roofMat, material]
	var mat01 = mat0X


	var roofMesh = PlaceRoof(this, min_height, height, roofHeight, points, mat0X)  /// R#ooof
	if (roofMesh) roofHeight = roofMesh.roofHeight
	//??roofMat    = material
	//} else
	//	roofHeight = 0

	var y = height // - DrawDelta*5

	var m = new THREE.Matrix4()
	var depth_ = height - roofHeight - min_height
	if (isNaN(depth_))
		depth_ = 3.333
	var geometry = new THREE.ExtrudeGeometry(shape, { depth: depth_, bevelEnabled: false })
	geometry.applyMatrix4(m.makeRotationX(g(90))) //    mesh.rotation.x = g(90)
	geometry.applyMatrix4(m.makeTranslation(0, depth_ + min_height, 0)) //  - DrawDelta*5

	var n = Math.floor(this.wayNodes.length / 2)
	var no = nodes[this.wayNodes[n]]
	var dx = Math.abs(no.x - posX0)
	var dz = Math.abs(no.z - posZ0)
	var dd = Phytagoras(dx, dz)
	var d0 = dd < dbgRange
	if (d0)
		no = 1

	if (gOptimize == 0 || d0) {
		mesh = new THREE.Mesh(geometry, mat01)
		mesh.castShadow = mesh.receiveShadow = shadow
		mesh.name = "WB" + this.id
		mesh.osm = this

		//var box = new THREE.BoxGeometry(3, 3, 3)
		//var mmm = new THREE.Mesh(box, mlm.yellow)
		//scene.add(mmm)

		if (roofMesh) mesh.add(roofMesh)
		//if(part && !building)  // only a part: to more-map: show only if close
		add2Tile(mesh, this.wayNodes[0])
		this.mesh = mesh // To hide building if a model replaces it
	} else {
		var iCol = 0
		geometry.groups[0].materialIndex = roofMat.iCol; // roof first
		geometry.groups[1].materialIndex = material.iCol; // walls

		geometry.osm = this
		add2TileG(geometry, iCol, this.wayNodes[0])
		if (roofMesh) { // mesh.add(roofMesh)
			var geometry = roofMesh.geometry.translate(roofMesh.position.x, roofMesh.position.y, roofMesh.position.z)
			if (geometry.groups.length) {
				geometry.groups[0].materialIndex = roofMat.iCol; // roof first
				geometry.groups[1].materialIndex = material.iCol; // walls				
			}
			add2TileG(geometry, roofMat.iCol, this.wayNodes[0]) // Gleiches Farb-Paar wie beim Haus!
		}
	}

} // Ende Building bbbb






function PlaceRoof(way, min_height, height, roofHeight, points, materialX) { // Render function /// bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb bbb

	var shape = new THREE.Shape(points)

	var roofShape
	if (!(roofShape = way.GetTag("roof:shape"))
		&& !(roofShape = way.GetTag("building:roof:shape"))
	) {
		//var small = Math.sqrt( shape.getLength() )  < 10
		//if(!small)
		return 0
		//roofShape = "gab led"
	}

	var maxx = -1e9
	var maxz = -1e9
	var minx = +1e9
	var minz = +1e9
	for (var i in points) {
		maxx = Math.max(maxx, points[i].x)
		maxz = Math.max(maxz, points[i].y)
		minx = Math.min(minx, points[i].x)
		minz = Math.min(minz, points[i].y)
	}
	var x0 = (minx + maxx) / 2   // Mittelpunkt Meter-absolut
	var z0 = (minz + maxz) / 2

	var across = way.GetTag("roof:orientation") == "across"

	if (roofHeight > height) roofHeight = height

	switch (roofShape) {
		case "flat": /////////////////////////////////////////// fff
			return undefined  // default

		case "pyramidal": ////////////////////////////////////// ppp
			// https://www.openstreetmap.org/way/1193223790#map=19/49.695779/11.045515
			// localhost:5173/go.html?km=1&lat=49.695779&lon=11.045515&ele=500.00&dir=353&view=-89&user=karlos&dbg=0&con=1&tiles=5&opt=2
			// http://localhost:5173/go.html?km=1&lat=49.69554288&lon=11.04548212&ele=6.45&dir=354&view=-4&user=karlos&dbg=0&con=1&tiles=5&opt=2
			// log("roof:shape/height",roofShape,roofHeight)
			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 2
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			var p = 0
			var geometry = new THREE.BufferGeometry(); var vertices = []; var faces = []
			vertices.push(0, 0, 0) // zerro.point at the upper dip     // Meter-relativ
			for (p in points) {
				vertices.push(points[p].x - x0, -roofHeight, points[p].y - z0)    // Meter-relaitv
				if (p * 1 > 0) faces.push(0, p * 1, p * 1 + 1)
			}   //      geometry.faces.push( new THREE.Face3( 0, p*1, p*1+1 ) )
			geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
			geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([1., 1.]), 2));
			geometry.setIndex(faces);
			geometry.computeVertexNormals();
			geometry.osm = way
			var material = materialX[0]
			break



		case "dome": ///////////////////////////////////////////// ddd
			// https://www.openstreetmap.org/way/32765625#map=19/49.602936/11.018811
			// http://localhost:5173/go.html?km=1&lat=49.60240471&lon=11.01915721&ele=9.16&dir=17&view=-5&user=karlos&dbg=0&con=1&tiles=5&opt=2
			// log("roof:shape/height",roofShape,roofHeight)
			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 2
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			var geometry = new THREE.BufferGeometry(); var vertices = []; var faces = []
			var v = 0 // verticle counter
			var c = 6 // count of rings from 0 to 90 degrees
			var p = 0
			for (p in points) { // all points of a ring
				// calculate angel center to side-point
				var x = (points[p].x - x0)
				var z = (points[p].y - z0)
				for (var a = 0; a <= 90; a += (90 / c)) {// all angles
					var sc = SinCos(g(a))
					vertices.push(x * sc[1], -roofHeight * (1 - sc[0]), z * sc[1]); v++
					if (p > 0 && a > 0) {
						faces.push(v - 1, v - 0 - 2, v - c - 2)
						faces.push(v - 2, v - c - 3, v - c - 2)
					}
				}  // a
			} // p
			geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
			geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([1., 1.]), 2));
			geometry.setIndex(faces);
			geometry.computeVertexNormals();
			geometry.osm = way
			var material = materialX[1]
			// if (level_to_height) roofHeight = 0 // Wenn die Dachhöhe in Level ist, kommt das Dach Über, nicht ins Haus

			break


		case "onion":
			// https://www.openstreetmap.org/way/255320206#map=19/49.719743/11.057078 Forchheim
			// https://www.openstreetmap.org/way/136144290#map=19/48.574079/13.465440 Passau

			// log("roof:shape/height",roofShape,roofHeight)

			if (roofHeight == 0) {
				roofHeight = (maxx - minx) * 1.5
				//if (roofHeight > height / 2) roofHeight = height / 2
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
			var geometry = new THREE.BufferGeometry(); var vertices = []; var faces = []

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
					vertices.push(x1 * xz, yy, z1 * xz);
					vertices.push(x2 * xz, yy, z2 * xz);
					if (i > 0) {
						// push 2 triangles = 1 "face"
						faces.push(v + 0, v + 2, v + 1);
						faces.push(v + 1, v + 2, v + 3);
					}
					v += 2; // log("face:",i,Kurve.length)
				}  // i
			} // s

			geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
			geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([1., 1.]), 2));
			geometry.setIndex(faces);
			geometry.computeVertexNormals();
			geometry.osm = way
			var material = materialX[0]
			//if (level_to_height) {
			//	height = height + roofHeight
			//	roofHeight = 0	// Wenn die Dachhöhe in Level ist, kommt das Dach Über, nicht ins Haus
			//}

			break




		case "skillion": //// Roof will replace the whole building!
			//log("roof skillion id: ",way.id)
			// Hier wird das genze Gebäude samt Dach erzeugt! Erst als Flachdach, dann eine Kante abgesenkt. Es entsteht eine Schräge

			// overpass: wr["roof:shape"="skillion"]({{bbox}});
			// https://www.openstreetmap.org/way/136144290#map=19/48.574120/13.465354
			// http://localhost:5173/go.html?km=1&lat=48.57352823&lon=13.46502089&ele=54.30&dir=348&view=-34&user=karlos&dbg=0&con=1&tiles=5&opt=2
			// http://localhost:5173/index.html?km=1&lat=51.50305497&lon=-0.12010001&ele=132.89&dir=252&view=-40&user=karlos&dbg=0&con=1&tiles=5&opt=2

			// https://www.openstreetmap.org/way/136144290#map=19/48.574079/13.465440 Passau skillion
			// http://localhost:5173/index.html?km=1&lat=48.574079&lon=13.465440&ele=132.89&dir=252&view=-40&user=karlos&dbg=0&con=1&tiles=5&opt=2


			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 10
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			var m = new THREE.Matrix4()
			var geometry = new THREE.ExtrudeGeometry(shape, { depth: height - min_height, bevelEnabled: false })
			// geometry = BufferGeometryUtils.mergeVertices(geometry, 0.5/*1cm*/) does not reduce to 8 but 3*8  vertices
			geometry.applyMatrix4(m.makeRotationX(g(90)))
			x0 = z0 = 0 // ist schon Meter-Absolut

			//const reverse = !THREE.ShapeUtils.isClockWise(points); // Must always be clockwise?
			//if (reverse) points = points.reverse();

			// ... dann werden die Wände gesenkt - sehr getrixt!
			// log("id points 0 1 x y:",way.id,points[0].x,points[0].y,points[1].x,points[1].y)
			var b = longestSideAngle(points)

			if (!across) // Ussually the slope gets down from that Side. BUT: If the rotation is different, the slope is different! Revert??
				b += g(90)

			// Todo for all direction tag requests: add N S E W NE SES
			var d = way.GetTag("roof:slope:direction", false, true)
			if (d) b = g(90 - d)
			var d = way.GetTag("roof:direction", false, true)
			if (d) b = g(90 - d)

			if (b > g(360)) b -= g(360)
			if (b < g(0)) b += g(360)

			geometry.applyMatrix4(m.makeRotationY(-b))
			//geometry.computeFaceNormals();   // ttty Flächenfarbe einrichten
			//geometry.computeVertexNormals(); // Farbübergänge weich


			var maxx = -1e9  // Höchste und niedrigste Stelle ermitteln
			var minx = +1e9
			var vlen = geometry.attributes.position.array.length / 3 // 3 int for one vertex.
			var plen = points.length - 1
			var vertices_array = geometry.attributes.position.array
			//r (var i = 0; i < geometry.vertices.length / 2; i++) {
			for (var i = 0; i < vlen; i++) {
				var x = vertices_array[i * 3]
				maxx = Math.max(maxx, x) // geometry.vertices[i].
				minx = Math.min(minx, x) // geometry.vertices[i].
			}
			var dm = roofHeight / (maxx - minx) // Höhen/Tiefe der Nodes/Ecken berechenen
			//r v2 = geometry.vertices.length / 2
			//r (var i = 0; i < v2; i++) {
			for (var i = 0; i < vlen; i++) {
				var y = vertices_array[i * 3 + 1]
				if (y >= -0.001) { // It's the roof, not the lower floor of the building(block)
					var x = vertices_array[i * 3 + 0]
					var h3 = (x - minx) * dm // !!: If the roof is "left" of the hightest side, it also must go down
					vertices_array[i * 3 + 1] = -Math.abs(h3)
				}
			}

			geometry.applyMatrix4(m.makeRotationY(+b))
			geometry.osm = way

			var material = materialX;
			roofHeight = height - min_height // Ergibt als Building 0. Damit nur die roof-geometry erscheint
			break


		// ggg ggg ggg
		case "gabled":
			var angle = longestSideAngle(points)	// this.options.roof.direction;

			if (roofHeight == 0) {
				roofHeight = (maxx - minx) / 10
				if (roofHeight > height / 2) roofHeight = height / 2
			}

			if (across) {
				angle = angle > g(90) ? angle - g(90) : angle + g(90);
			}
			const center = /*BuildingShapeUtils.*/calc_center(points) // Don't rotate to get the center of rotation: // , angle); // / 180 * Math.PI);
			const options = {
				center: center,
				angle: angle,
				depth: roofHeight // this.options.roof.height,
			};

			x0 = z0 = 0 // ist schon Meter-Absolut
			var geometry = new WedgeGeometry(/*this.*/shape, options);
			var m = new THREE.Matrix4()
			geometry.applyMatrix4(m.makeRotationX(g(-90))) //    mesh.rotation.x = g(90)
			geometry.applyMatrix4(m.makeTranslation(0, -roofHeight, 0)) //    Roof gets part  of the building height

			//var indices = [] . tttx
			//for (var i = 0; i < geometry.attributes.position.array.length; i++) {
			//	indices.push(i)
			//}
			//geometry.setIndex(indices)
			//geometry.computeVertexNormals();

			geometry.osm = way
			// geometry.toNonIndexed()
			var material = materialX

			//roofHeight = 0 // This roof does NON include the building below it. The original mesh needs the netto building heigt without the roof. But the roof will be substracted. So set it to 0 here.
			break



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
	mesh.position.y = height // ?? Unterhalb/ Teil von Building-Haupttteil
	mesh.castShadow = mesh.receiveShadow = shadow
	mesh.osm = way
	mesh.roofHeight = roofHeight

	return mesh
}




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////  This code file is from: https://github.com/Beakerboy/OSMBuilding/blob/main/src/extras/BuildingShapeUtils.js  ////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/**
 * Find the center of a closed way
 *
 * @param {THREE.Shape} shape - the shape
 *
 * @return {[number, number]} xy - x/y coordinates of the center
 */
function calc_center(shape) {
	const extents = calc_extents(shape);
	const center = [(extents[0] + extents[2]) / 2, (extents[1] + extents[3]) / 2];
	return center;
}


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
	var last = points.length - 1
	if (points[0].x != points[last].x || points[0].y != points[last].y) points.push(points[0]);
	const angles = [];
	var p1;
	var p2;
	for (let i = 0; i < points.length - 1; i++) {
		p1 = points[i];
		p2 = points[i + 1];
		// !!  Its atan2(y,x)   NOT:x,y!
		// East = (0,1) = 0    Nord(1,0) = 1.5(Pi/2)   West(0,-1) = 3,14(Pi)   South(-1,0) = -1.5(-Pi)
		let angle = Math.atan2((p2.y - p1.y), (p2.x - p1.x));
		if (angle >= Math.PI / 2) {
			angle -= Math.PI;
		} else if (angle < -Math.PI) {	// 1. Error in Code of Building-Viewer?!
			angle += (2 * Math.PI);		// 2. Error in Code of Building-Viewer?!
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
