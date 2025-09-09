///// MAIN+Code /////
function KeepRight() {
	if(dbg>2) log("KeepRight Init")

	xmlhttp2 = new XMLHttpRequest();
	xmlhttp2.onreadystatechange = function() {
		if ((xmlhttp2.readyState == 4) && (xmlhttp2.status == 200)) {
			log("KeepRight ... Query beantwortet")
			KeepRight_readData(xmlhttp2.responseText) // Antworttext auswerten
		}
	}

	xmlhttp2.onprogress= function(evt) {
		if(dbg>0) log("KeepRight progress - loaded,total: ",evt.loaded , evt.total)
	}


	//------------------------------------------------
 	this.LoadAndPlace = function(left,right, bottom,top_) { with(this) {

	
// h t t p://www.keepright.at/report_map.php?lang=de
var chAll = "&ch30=1&ch40=1&ch50=1&ch70=1&ch90=1&ch100=1&ch110=1&ch120=1&ch130=1&ch150=1&ch160=1&ch170=1&ch180=1&ch191=1&ch192=1&ch193=1&ch194=1&ch195=1&ch196=1&ch197=1&ch198=1"
          + "&ch201=1&ch202=1&ch203=1&ch204=1&ch205=1&ch206=1&ch207=1&ch208=1&ch210=1&ch220=1&ch231=1&ch232=1"
          + "&ch270=1&ch281=1&ch282=1&ch283=1&ch284=1&ch285=1&ch291=1&ch292=1&ch293=1&ch294=1&ch295=1&ch296=1&ch297=1&ch298=1"
          + "&ch311=1&ch312=1&ch313=1&ch320=1&ch350=1&ch370=1&ch380=1&ch401=1&ch402=1&ch411=1&ch412=1&ch413=1"
// &number_of_tristate_checkboxes=8&highlight_error_id=0&highlight_schema=0&lat=48.20808&lon=16.37221&zoom=14&show_ign=1&show_tmpign=1 */
// "&ch=20,30,311,312"


		var all = "30,40,50,70,90,100,110,120,130,150,160,170,180,191,192,193,194,195,196,197,198,201,202,203,204,205,206,207,208,210,220,231,232,270,281,282,283,284,285,291,292,293,294,295,296,297,298,311,312,313,320,350,370,380,401,402,411,412,413"

		var url = httpx+"keepright.ipax.at/export.php?format=gpx&ch="+all+
		  "&left="+left+
		"&bottom="+bottom+
		 "&right="+right+
		   "&top="+top_
		
		// Beispiel: "httpx://keepright.ipax.at/export.php?format=gpx&ch=20,30,311,312&left=-82.39&bottom=30&right=-82.1&top=30.269"

/*		httpx://www.keepright.at/report_map.php?lang=de
		&ch30=1&ch40=1&ch50=1
		&number_of_tristate_checkboxes=8
		&highlight_error_id=0
		&highlight_schema=0
		&lat=48.20808
		&lon=16.37221
		&zoom=14
		&show_ign=1
		&show_tmpign=1
		*/
		
		xmlhttp2.open("GET", url, true);
	//??xmlhttp2.setRequestHeader( 'Access-Control-Allow-Origin', '*');
		xmlhttp2.send();
		if(dbg>0) log("KeepRight Query ...");
		if(dbg>1) log(url)

	}}// LoadAndPlace


}// KeepRight-Ende
	
  
  
function Get(l,sa,se)
{
	var a = l.indexOf(sa);
	var e = l.indexOf(se,a+sa.length);
  //log(l.substr( a+sa.length , e-(a+sa.length) ))
	return      l.substr( a+sa.length , e-(a+sa.length) )
}
		    
function KeepRight_readData(data) { 	/// Vielleicht gibt es einen XML/GPX-2-JS Konverter fertig irgendwo
	if(dbg>3) log("KeepRight readData start")
	var txt  = data;
	   	
	while (txt.length > 22) {                         // bis Ende des Strings.
		//log("REST: ",txt.substr(0,77))
		var a = txt.indexOf( "<wpt ");
		var e = txt.indexOf("</wpt>",5);
		if(a<0 || e<0) break
		var l = txt.substr( a+5,e-a-5)
		//log("txt: ",a+5,e-a-5,l," - ",e,txt.length)
		txt = txt.slice(e, txt.length);
	   	
		var lon    = Get(l, "lon=\"", "\"" )
		var lat    = Get(l, "lat=\"", "\"" )
		var name_  = Get(l, "<name><![CDATA[", "]" )
		var desc   = Get(l, "<desc><![CDATA[", "]" )
		var schema = Get(l, "<schema>", "<" )
		var kr_id  = Get(l, "<id>", "<" )
		var error  = Get(l, "<error_type>", "<" )
		var type   = Get(l, "<object_type>", "<" )
		var osmid  = Get(l, "<object_id>", "<" )

        var x = GetLon2x(lon,lat);
        var z = GetLat2z(lat);
		if(dbg>3) log("EINTRAG lon,lat:",lon,lat,"Name:..",name_,desc,schema,kr_id,error,type,osmid,"x,z:",x,z,curGeoPosLon,curGeoPosLat)
			
		if(!keepDo) continue
			
            desc = desc.slice(6, desc.length);		
		
		var wayKARL = new Way(kr_id)
		if( wayKARL.id>0 ) {
			wayKARL.typeMain = "_keep" // Wird von Renderer (schon) nicht mehr bearbeitet. Daher manuel eintragen
			wayKARL.AddTag("Keepright",type)
			wayKARL.AddTag("",name_)
			wayKARL.AddTag("",desc)
			wayKARL.AddTag("","")
			wayKARL.AddTag("OSM ID",osmid)
			wayKARL.AddTag("K.R.  ID",kr_id)

			wayKARL.AddTag("_keep",schema)
			wayKARL.AddTag("Error",error)
		var geometry = new THREE.CylinderGeometry( 5, 0, 100, 3 );
		var mesh     = new THREE.Mesh( geometry, mlm.dblau );
		    mesh.position.y = 100/2
		    mesh.position.x = x
		    mesh.position.z = z
		    mesh.osm        = wayKARL
		    maps.add( mesh );
		}
	}
	
	if(dbg>1) log("KeepRight readData end")
}
