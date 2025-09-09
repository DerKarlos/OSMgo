
function Packman() {
	log("Packman-GO")
	this.eier = []
    var max = 9.9;
	while(max<100 && this.eier.length<4) {
		//---Near---
		this.eier = [] // noch keine
		for(var w in ways) {
		    var way = ways[w]
			if(this.eier.length>=50) break
			if(way.typeMain!="highway") continue // Wenn es kein Weg ist, nicht weiter
			for(var n in way.wayNodes) {
        		var node    = nodes[way.wayNodes[n]]
				if(node.idWay!=way.id) continue // nur der Drawer, nix doppelt!
				if((Math.abs(node.x)<max)&&(Math.abs(node.z)<max)) this.eier.push(node)
			}
		}
		//---Near---
		max *= 1.4
	}// while zu wenig

	//alle eiern und note.packman = 0
	for(var n in   this.eier) {
		var node = this.eier[n]
	    var geometry = new THREE.SphereGeometry(1,16)
	    var mesh     = new THREE.Mesh(geometry, mlm.yellow)
        mesh.position.set( node.x, 2, node.z)
		mesh.castShadow    = shadow
	    map.add(mesh)
		this.eier[n].eiMesh  = mesh
		this.eier[n].packman = 0
	}
	if(dbg>2) log("Packman - Eier: ", this.eier.length)	




	//------------------------------------------------
    this.Play = function(seconds) { with(this) {
		var dtMax = 5.0
		for(var n in this.eier) {
			var node = this.eier[n]
			if(node.packman==0) {
				var dx = Math.abs(node.x-camera.position.x)
				var dz = Math.abs(node.z-camera.position.z)
				var d  = Phytagoras(dx,dz)
				//log( Math.floor(d), Math.floor(dx), Math.floor(dz) )
				if(d<15) { // Meter
					node.packman = seconds;
					node.eiMesh.material = mlm.water  // mlm UNDEFINED?
					gamePoints+=50
				}
				continue
			}// =0
			if(node.packman>0) {
				// animate
     			var dt = seconds-node.packman
				var z  = dt/dtMax  // Zeit in 1
		        var sc = SinCos(z*20,1);
				node.eiMesh.position.x += (dt*sc[0]/30)				
				node.eiMesh.position.z += (dt*sc[1]/30)				
				node.eiMesh.position.y = 2-dt*dt/8

				if(dt>dtMax) { // Sekunden
					map.remove(node.eiMesh)
					node.packman = -1
					gamePoints+=50
					continue
				}
			}// >0
		}
	}}
	
}
