<?php
/*=====================================================================
 * KARL/SPY-Log: Eintrag in Log-Datei vornehmen.
 *
 * Es wird ggf. ein Subfolder angelegt und dort eine Zeile
 * an ein neues/altes Textfile mit Jahr/Monat im Namen angehängt.

   http://php.net/manual/de/function.mail.php

   Einbauen: OnSeiteVerlassen: log

   nur als XML: http://api.geonames.org/extendedFindNearby?lat=49.7154441627508&lng=11.086353694690166&username=demo

 */

date_default_timezone_set('Europe/Berlin');


$datum = date("Y-m-d");
$zeit  = date("H:i:s");
$ip    = getenv("REMOTE_ADDR");
$site  = $_SERVER['REQUEST_URI'];
$agent = $_SERVER['HTTP_USER_AGENT'];
$subdir= "MMC216.log1";

if (!file_exists($subdir))
  mkdir($subdir);

$monat = date("n");
$jahr  = date("y") % 100;
$fName = sprintf("%s/log_%02d%02d", $subdir, $jahr, $monat);

/// TXT ////////

$eintrag = "$datum $zeit $ip \"$site\" $agent";

$fd = fopen($fName.'.txt', "a");
fputs( $fd, "$eintrag\n");
fclose($fd);



/// HTML //////

$lola = "";
$pos  = strpos($site, '|'); // Kennung: Mit lat/lon
if($pos) {
    $lola = substr($site,    $pos+1);
    $site = substr($site, 0, $pos  );
    $links = " <a target= \"_blank\" href=\"http://www.OSMgo.org?nol=1&user=Karlos$lola\">go</a> ".
             " <a target= \"_blank\" href=\"http://www.OSMgo.org/OSMgoSlippy.html?nol=1$lola\">map</a>";
}

$site = str_ireplace( '%20',' ', $site);
$url = "";
$pos = strpos($site,"&name="); // Kennung: location-name angegeben
if($pos) {
    $name = substr($site,    $pos+6);
    $url  = substr($site, 0, $pos  );
    $site = $name;
}



$pos = strpos($site, '@'); // Login-Kennung
if($pos) {
    $eintrag  = "$zeit ".substr($site,$pos+1)."<br>\n";
} else {

    $ip     = getenv("REMOTE_ADDR");
    $url = "http://freegeoip.net/csv/$ip"; // echo "url:$url<br>\n";
    $handle = curl_init($url);
    curl_setopt($handle,  CURLOPT_RETURNTRANSFER, TRUE);
    $iptext = curl_exec($handle);// Get the HTML or whatever is linked in $url. //    echo "response:$response<br>";
    // $httpCode = curl_getinfo($handle, CURLINFO_HTTP_CODE);    // Check for 404 (file not found). //    echo "httpCode:$httpCode<br>";
    curl_close($handle);

    $eintrag  = "<br><br>$zeit $datum - $site<br>".
                        "$zeit TO: $links FROM:$iptext<br><br>";
                    
    $headers  = "MIME-Version: 1.0\n" ;
    $headers .= "Content-Type: text/html; charset=\"iso-8859-1\"\n";
    $headers .= "X-Priority: 1 (Highest)\n";
    $headers .= "X-MSMail-Priority: High\n";
    $headers .= "Importance: High\n";                
    $headers .= "From: OSMgo-Start <karlos@osmgo.org>\n";                
    $ret = mail("karlos@osmgo.org", "OSMgo: Used" , $eintrag, $headers);  // ALT: ac1000 de     nur so geht es !?
    //echo "MAIL!";
}





    
$fd = fopen($fName.'.html', "a");
fputs( $fd, "$eintrag\n\n");
fclose($fd);


/* / RSS ////////

str_ireplace ( '&' , '&amp;' , $lola  );

$eintrag =
"<item>\n".
"	<title>User IP: $ip</title>\n".
"	<description>\"Beschreibung?\"</description>\n".
"	<link>http://www.OSMgo.org/OSMgoSlippy.html?nol=1&amp;$lola</link>\n".  //// in lolo muss aus & ein &amp: rein
"	<author>joesmith@example.com (Joe Smith)</author>\n".
"	<guid isPermaLink=\"false\">$datum_$zeit_$ip</guid>\n".
"	<pubDate>Tue, 14 Feb 20$jahr $zeit GMT</pubDate>\n".
"</item>\n".
"\n";

$fd = fopen("$subdir/log.rss", "a");
fputs( $fd, "$eintrag");
fclose($fd);

//////////////////////////// */


echo "Log.".$ip;
?>