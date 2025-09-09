<?php
// USER-Login (von Martin übernommen)
//echo "Start<br>";

date_default_timezone_set('Europe/Berlin');

$ip     = getenv("REMOTE_ADDR");
if($ip)
    if(substr($ip, 0, 1)=='.') {$ip = "0".$ip;}
//echo "ip#$ip#<br>";

if (!isset($_GET['username']))
  exit('*** Ungueltiger Aufruf ohne Anmeldung');

$MyName = $_GET['username'];
$llName = $_GET['name']; // LatLon-Destination name

if ($MyName == '')
    $MyName = "myname";
    // exit('*** Ganz ohne Anmeldung geht es leider nicht ...');
if (strlen($MyName) < 3)
    $MyName += "_name";
    //exit('*** Ein Username muss mindestens drei Zeichen lang sein.');
if (strlen($MyName) > 20)
    $MyName = substr($MyName, 1, 20);
    //exit('*** Bitte nicht &uuml;bertreiben: maximal 20 Zeichen f&uuml;r einen Usernamen.');

/******/
            /////$ipapi = curl_init("http://ipapi.co/$ip/csv");
            /////$ipapi = curl_init("http://ip-api.com/csv/$ip");
            /////$ipapi = curl_init("http://freegeoip.net/csv/$ip");
                 $ipapi = curl_init("https://ipinfo.io/$ip/geo?token=67716353a63a0f");

curl_setopt(     $ipapi,  CURLOPT_RETURNTRANSFER, TRUE);
curl_setopt(     $ipapi,  CURLOPT_CONNECTTIMEOUT ,8);
curl_setopt(     $ipapi,  CURLOPT_TIMEOUT,        8); //timeout in seconds
// set_time_limit(0);// to infinity for example - enlarge time execution of php script self:

$ipl = curl_exec($ipapi);
curl_close(      $ipapi);

//echo "ipl#$ipl<br>";

//echo "1#$ipl#<br>";

if($ipl=="" || strlen($ipl)>400)
$ipl = "X0,USER,user,X3,X4,X5,X6,X7,X8,X9,XA,XB,XC"; // IP servie did not work: set default values
$ipi = explode('"',$ipl);  //$ipi = explode(",",$ipl);
//echo "ipi x#$ipi[7]#<br>";

// asn,city,country,country_name,ip,latitude,longitude,org,postal,region,region_code,timezone
// AS31334,Bruck in der Oberpfalz,DE,Germany,188.194.113.44,49.250500,12.308900,Vodafone Kabel Deutschland GmbH,92436,Bavaria,BY,Europe/Berlin
// 12      13                     14 15      16             17        18        19                              20,   21      22 23
//$iState = $ipi[21]; $iCity  = $ipi[13]; $iLat   = $ipi[17]; $iLon   = $ipi[18]; // => ipapi.co/$ip/csv"

// success,Germany,DE,BY,Bavaria,Erlangen,91052,49.5888,11.0098,Europe/Berlin,"Deutsche Telekom AG","Deutsche Telekom AG","AS3320 Deutsche Telekom AG",80.146.228.74
//       0,      1  2  3       4        5     6       7       8      = ip-api // = ip-api.com
//$iState = $ipi[1];// $iCity  = $ipi[5]; $iLon   = $ipi[7]; $iLat?  = $ipi[8]; // = ip-api.com

// 188.193.175.178,DE,Germany,BY,Bavaria,Augsburg,86159,Europe/Berlin,48.3509,10.8950,0   // => freegeoip.net/csv
//               0, 1,      2, 3,      4,       5,    6,            7,      8,      9,10  // => freegeoip.net/csv
//$iState = $ipi[2]; $iCity  = $ipi[5]; $iLat   = $ipi[8]; $iLon   = $ipi[9];             // => freegeoip.net/csv

// ipl#{ "ip": "188.193.201.34", "city": "Zirndorf", "region": "Bavaria", "country": "DE", "loc": "49.4424,10.9541", "postal": "90513" }
// 0,     1, 2, 3,             4, 5,      6!!      7, 8,        9,         10!!       11    12     13                 14        15 // => ipinfo.io
$lalo = explode(",",$ipi[19]);
$iState = $ipi[15]; $iCity  = $ipi[7]; $iLat   = $lalo[0]; $iLon   = $lalo[1];             // => freegeoip.net/csv
//echo "iLat#$iLat#iLon#$iLon#<br>";

if($iState=="BD") $iState="Bangladesh";
if($iState=="BE") $iState="Belgium";
if($iState=="BF") $iState="Burkina Faso";
if($iState=="BG") $iState="Bulgaria";
if($iState=="BA") $iState="Bosnia and Herzegovina";
if($iState=="BB") $iState="Barbados";
if($iState=="WF") $iState="Wallis and Futuna";
if($iState=="BL") $iState="Saint Barthelemy";
if($iState=="BM") $iState="Bermuda";
if($iState=="BN") $iState="Brunei";
if($iState=="BO") $iState="Bolivia";
if($iState=="BH") $iState="Bahrain";
if($iState=="BI") $iState="Burundi";
if($iState=="BJ") $iState="Benin";
if($iState=="BT") $iState="Bhutan";
if($iState=="JM") $iState="Jamaica";
if($iState=="BV") $iState="Bouvet Island";
if($iState=="BW") $iState="Botswana";
if($iState=="WS") $iState="Samoa";
if($iState=="BQ") $iState="Bonaire, Saint Eustatius and Saba";
if($iState=="BR") $iState="Brazil";
if($iState=="BS") $iState="Bahamas";
if($iState=="JE") $iState="Jersey";
if($iState=="BY") $iState="Belarus";
if($iState=="BZ") $iState="Belize";
if($iState=="RU") $iState="Russia";
if($iState=="RW") $iState="Rwanda";
if($iState=="RS") $iState="Serbia";
if($iState=="TL") $iState="East Timor";
if($iState=="RE") $iState="Reunion";
if($iState=="TM") $iState="Turkmenistan";
if($iState=="TJ") $iState="Tajikistan";
if($iState=="RO") $iState="Romania";
if($iState=="TK") $iState="Tokelau";
if($iState=="GW") $iState="Guinea-Bissau";
if($iState=="GU") $iState="Guam";
if($iState=="GT") $iState="Guatemala";
if($iState=="GS") $iState="South Georgia and the South Sandwich Islands";
if($iState=="GR") $iState="Greece";
if($iState=="GQ") $iState="Equatorial Guinea";
if($iState=="GP") $iState="Guadeloupe";
if($iState=="JP") $iState="Japan";
if($iState=="GY") $iState="Guyana";
if($iState=="GG") $iState="Guernsey";
if($iState=="GF") $iState="French Guiana";
if($iState=="GE") $iState="Georgia";
if($iState=="GD") $iState="Grenada";
if($iState=="GB") $iState="United Kingdom";
if($iState=="GA") $iState="Gabon";
if($iState=="SV") $iState="El Salvador";
if($iState=="GN") $iState="Guinea";
if($iState=="GM") $iState="Gambia";
if($iState=="GL") $iState="Greenland";
if($iState=="GI") $iState="Gibraltar";
if($iState=="GH") $iState="Ghana";
if($iState=="OM") $iState="Oman";
if($iState=="TN") $iState="Tunisia";
if($iState=="JO") $iState="Jordan";
if($iState=="HR") $iState="Croatia";
if($iState=="HT") $iState="Haiti";
if($iState=="HU") $iState="Hungary";
if($iState=="HK") $iState="Hong Kong";
if($iState=="HN") $iState="Honduras";
if($iState=="HM") $iState="Heard Island and McDonald Islands";
if($iState=="VE") $iState="Venezuela";
if($iState=="PR") $iState="Puerto Rico";
if($iState=="PS") $iState="Palestinian Territory";
if($iState=="PW") $iState="Palau";
if($iState=="PT") $iState="Portugal";
if($iState=="SJ") $iState="Svalbard and Jan Mayen";
if($iState=="PY") $iState="Paraguay";
if($iState=="IQ") $iState="Iraq";
if($iState=="PA") $iState="Panama";
if($iState=="PF") $iState="French Polynesia";
if($iState=="PG") $iState="Papua New Guinea";
if($iState=="PE") $iState="Peru";
if($iState=="PK") $iState="Pakistan";
if($iState=="PH") $iState="Philippines";
if($iState=="PN") $iState="Pitcairn";
if($iState=="PL") $iState="Poland";
if($iState=="PM") $iState="Saint Pierre and Miquelon";
if($iState=="ZM") $iState="Zambia";
if($iState=="EH") $iState="Western Sahara";
if($iState=="EE") $iState="Estonia";
if($iState=="EG") $iState="Egypt";
if($iState=="ZA") $iState="South Africa";
if($iState=="EC") $iState="Ecuador";
if($iState=="IT") $iState="Italy";
if($iState=="VN") $iState="Vietnam";
if($iState=="SB") $iState="Solomon Islands";
if($iState=="ET") $iState="Ethiopia";
if($iState=="SO") $iState="Somalia";
if($iState=="ZW") $iState="Zimbabwe";
if($iState=="SA") $iState="Saudi Arabia";
if($iState=="ES") $iState="Spain";
if($iState=="ER") $iState="Eritrea";
if($iState=="ME") $iState="Montenegro";
if($iState=="MD") $iState="Moldova";
if($iState=="MG") $iState="Madagascar";
if($iState=="MF") $iState="Saint Martin";
if($iState=="MA") $iState="Morocco";
if($iState=="MC") $iState="Monaco";
if($iState=="UZ") $iState="Uzbekistan";
if($iState=="MM") $iState="Myanmar";
if($iState=="ML") $iState="Mali";
if($iState=="MO") $iState="Macao";
if($iState=="MN") $iState="Mongolia";
if($iState=="MH") $iState="Marshall Islands";
if($iState=="MK") $iState="Macedonia";
if($iState=="MU") $iState="Mauritius";
if($iState=="MT") $iState="Malta";
if($iState=="MW") $iState="Malawi";
if($iState=="MV") $iState="Maldives";
if($iState=="MQ") $iState="Martinique";
if($iState=="MP") $iState="Northern Mariana Islands";
if($iState=="MS") $iState="Montserrat";
if($iState=="MR") $iState="Mauritania";
if($iState=="IM") $iState="Isle of Man";
if($iState=="UG") $iState="Uganda";
if($iState=="TZ") $iState="Tanzania";
if($iState=="MY") $iState="Malaysia";
if($iState=="MX") $iState="Mexico";
if($iState=="IL") $iState="Israel";
if($iState=="FR") $iState="France";
if($iState=="IO") $iState="British Indian Ocean Territory";
if($iState=="SH") $iState="Saint Helena";
if($iState=="FI") $iState="Finland";
if($iState=="FJ") $iState="Fiji";
if($iState=="FK") $iState="Falkland Islands";
if($iState=="FM") $iState="Micronesia";
if($iState=="FO") $iState="Faroe Islands";
if($iState=="NI") $iState="Nicaragua";
if($iState=="NL") $iState="Netherlands";
if($iState=="NO") $iState="Norway";
if($iState=="NA") $iState="Namibia";
if($iState=="VU") $iState="Vanuatu";
if($iState=="NC") $iState="New Caledonia";
if($iState=="NE") $iState="Niger";
if($iState=="NF") $iState="Norfolk Island";
if($iState=="NG") $iState="Nigeria";
if($iState=="NZ") $iState="New Zealand";
if($iState=="NP") $iState="Nepal";
if($iState=="NR") $iState="Nauru";
if($iState=="NU") $iState="Niue";
if($iState=="CK") $iState="Cook Islands";
if($iState=="XK") $iState="Kosovo";
if($iState=="CI") $iState="Ivory Coast";
if($iState=="CH") $iState="Switzerland";
if($iState=="CO") $iState="Colombia";
if($iState=="CN") $iState="China";
if($iState=="CM") $iState="Cameroon";
if($iState=="CL") $iState="Chile";
if($iState=="CC") $iState="Cocos Islands";
if($iState=="CA") $iState="Canada";
if($iState=="CG") $iState="Republic of the Congo";
if($iState=="CF") $iState="Central African Republic";
if($iState=="CD") $iState="Democratic Republic of the Congo";
if($iState=="CZ") $iState="Czech Republic";
if($iState=="CY") $iState="Cyprus";
if($iState=="CX") $iState="Christmas Island";
if($iState=="CR") $iState="Costa Rica";
if($iState=="CW") $iState="Curacao";
if($iState=="CV") $iState="Cape Verde";
if($iState=="CU") $iState="Cuba";
if($iState=="SZ") $iState="Swaziland";
if($iState=="SY") $iState="Syria";
if($iState=="SX") $iState="Sint Maarten";
if($iState=="KG") $iState="Kyrgyzstan";
if($iState=="KE") $iState="Kenya";
if($iState=="SS") $iState="South Sudan";
if($iState=="SR") $iState="Suriname";
if($iState=="KI") $iState="Kiribati";
if($iState=="KH") $iState="Cambodia";
if($iState=="KN") $iState="Saint Kitts and Nevis";
if($iState=="KM") $iState="Comoros";
if($iState=="ST") $iState="Sao Tome and Principe";
if($iState=="SK") $iState="Slovakia";
if($iState=="KR") $iState="South Korea";
if($iState=="SI") $iState="Slovenia";
if($iState=="KP") $iState="North Korea";
if($iState=="KW") $iState="Kuwait";
if($iState=="SN") $iState="Senegal";
if($iState=="SM") $iState="San Marino";
if($iState=="SL") $iState="Sierra Leone";
if($iState=="SC") $iState="Seychelles";
if($iState=="KZ") $iState="Kazakhstan";
if($iState=="KY") $iState="Cayman Islands";
if($iState=="SG") $iState="Singapore";
if($iState=="SE") $iState="Sweden";
if($iState=="SD") $iState="Sudan";
if($iState=="DO") $iState="Dominican Republic";
if($iState=="DM") $iState="Dominica";
if($iState=="DJ") $iState="Djibouti";
if($iState=="DK") $iState="Denmark";
if($iState=="VG") $iState="British Virgin Islands";
if($iState=="DE") $iState="Germany";
if($iState=="YE") $iState="Yemen";
if($iState=="DZ") $iState="Algeria";
if($iState=="US") $iState="United States";
if($iState=="UY") $iState="Uruguay";
if($iState=="YT") $iState="Mayotte";
if($iState=="UM") $iState="United States Minor Outlying Islands";
if($iState=="LB") $iState="Lebanon";
if($iState=="LC") $iState="Saint Lucia";
if($iState=="LA") $iState="Laos";
if($iState=="TV") $iState="Tuvalu";
if($iState=="TW") $iState="Taiwan";
if($iState=="TT") $iState="Trinidad and Tobago";
if($iState=="TR") $iState="Turkey";
if($iState=="LK") $iState="Sri Lanka";
if($iState=="LI") $iState="Liechtenstein";
if($iState=="LV") $iState="Latvia";
if($iState=="TO") $iState="Tonga";
if($iState=="LT") $iState="Lithuania";
if($iState=="LU") $iState="Luxembourg";
if($iState=="LR") $iState="Liberia";
if($iState=="LS") $iState="Lesotho";
if($iState=="TH") $iState="Thailand";
if($iState=="TF") $iState="French Southern Territories";
if($iState=="TG") $iState="Togo";
if($iState=="TD") $iState="Chad";
if($iState=="TC") $iState="Turks and Caicos Islands";
if($iState=="LY") $iState="Libya";
if($iState=="VA") $iState="Vatican";
if($iState=="VC") $iState="Saint Vincent and the Grenadines";
if($iState=="AE") $iState="United Arab Emirates";
if($iState=="AD") $iState="Andorra";
if($iState=="AG") $iState="Antigua and Barbuda";
if($iState=="AF") $iState="Afghanistan";
if($iState=="AI") $iState="Anguilla";
if($iState=="VI") $iState="U.S. Virgin Islands";
if($iState=="IS") $iState="Iceland";
if($iState=="IR") $iState="Iran";
if($iState=="AM") $iState="Armenia";
if($iState=="AL") $iState="Albania";
if($iState=="AO") $iState="Angola";
if($iState=="AQ") $iState="Antarctica";
if($iState=="AS") $iState="American Samoa";
if($iState=="AR") $iState="Argentina";
if($iState=="AU") $iState="Australia";
if($iState=="AT") $iState="Austria";
if($iState=="AW") $iState="Aruba";
if($iState=="IN") $iState="India";
if($iState=="AX") $iState="Aland Islands";
if($iState=="AZ") $iState="Azerbaijan";
if($iState=="IE") $iState="Ireland";
if($iState=="ID") $iState="Indonesia";
if($iState=="UA") $iState="Ukraine";
if($iState=="QA") $iState="Qatar";
if($iState=="MZ") $iState="Mozambique";

/****/




$ips = $iState;
if($iCity!="") $ips = $ips."/".$iCity;
//echo "#$ips#<br>";

if( ($iState) && $MyName=="user") $MyName = $iState;
if($MyName[0]=='"')
   $MyName = substr($MyName, 1, strlen($MyName)-2);
   $MyName = strtolower($MyName);


// User-Stammdaten-Datei muss existieren; mindestens ein Dummy-User
// # User-Stammdaten
// 2015-11-17 20:00:00;0;Mustermann;

$UserFileName = 'user/user.txt';
if (!file_exists($UserFileName))
  exit('*** Tja, '.$UserFileName.' ist nicht zu finden.');

/********/


// User-Stammdaten zum Lesen und Schreiben oeffnen
$userFile = fopen($UserFileName, 'r+') or exit('*** Kann '.$UserFileName.' nicht &ouml;ffnen');

$MyUserId = 0;
$count = 0;
$bNew = true;
//echo "MyName#$MyName<br>";
while (!feof($userFile)) {
  $line = rtrim(fgets($userFile));
  if ((strlen($line) > 1) && (substr($line, 0, 1) == "#"))
    continue;
  if (strlen($line) < 22)
    break;

  $items = explode(";", $line);
  //echo "items[2]#$items[2]<br>";
  if ($items[2] == $MyName) {
    $MyUserId = $items[1];
    $bNew = false;
    break;
  }
  $count++;
}


/********/

$jetzt  = date("Y-m-d").' '.date("H:i:s");
$dNow   = sscanf ($jetzt, "%d-%d-%d %d:%d:%d");
$til    = date("_m_d_H");
$secNow = ((($dNow[1]*30 + $dNow[2])*24 + $dNow[3])*60 + $dNow[4])*60 + $dNow[5];


// einen neuen User hinten anhaengen; User-ID ist die laufende Nummer
if ($bNew) {
  $MyUserId = $count;
  fprintf ($userFile, "%s;%d;%s;\r\n", $jetzt, $MyUserId, $MyName);
}
fclose($userFile);


$lon = "-0.12772";
if(isset(  $_GET['lon']))
    $lon = $_GET['lon'];
$lat = "51.50705";
if(isset(  $_GET['lat']))
    $lat = $_GET['lat'];


/********/

// Default-Startposition in LoLa  ALT: bezogen auf Ursprung der Szene; Absolut-Koordinaten
$xPos = $lon;					// lo   ALT: etwas nach rechts verschoben
$yPos = $lat;					// la   ALT: Augenhoehe ueber Boden
$zPos = 55.0;					// high ALT: nach hinten verschoben
$xRot = 0;						//           Nase waagrecht
$yRot = 0;					    //      ALT: leicht nach links schauend
$vMov = 0; // 2.0;					// leichte Vorwaertsbewegung bei Neustart

$tDelay = 2;					// Sekunden Wartezeit zur Weiterleitung
$state  = 1;

//-----------------------------------------------------------------------------
// Je User ein Statusfile mit fester Laenge:
// 0     1       2        3     4        5     6     7
// Zeit; Status; xPosAbs; yPos; zPosAbs; xRot; yRot; Speed;

$bNew = false;
$StFName = sprintf("user/st%03u.txt", $MyUserId);

if (file_exists($StFName)) {		// Statusfile bereits vorhanden?
  $fSt = fopen($StFName, 'r');
  $line = fgets($fSt);
  //echo "line:".$StFName."\n";

  if (strlen($line) < 60) {
    $bNew = true;					// wohl ungueltig: neu anlegen
    echo '<p>'.$MyName.', deine Zustandsdaten sind ungueltig...'.$line.' # '.$StFName.'</p>';
  } else {  // User hatte schon alte Position

    //$items = explode(";", $line);
    //$zeit =          $items[0];
    //$state =  intval($items[1]);
    //$xPos = floatval($items[2]);
    //$yPos = floatval($items[3]);
    //$zPos = floatval($items[4]);
    //$xRot = floatval($items[5]);
    //$yRot = floatval($items[6]);
    //$vMov = floatval($items[7]);

    $dat1 = sscanf ($zeit, "%d-%d-%d %d:%d:%d");
    $min1 = (($dat1[1]*30 + $dat1[2])*24 + $dat1[3])*60 + $dat1[4];
    if (($state == 0) || ($min1 < $secNow-180)) {
      // echo '<p>'.$MyName.', du warst zuletzt online: '.$zeit.'</p>';
      $zeit = $jetzt;
      $state = 1;
    } else {
      // echo '<p>'.$MyName.', du bist ja schon aktiv drin!</p>';
      $tDelay = 1;
    }
  }
  fclose ($fSt);
} else {							// noch kein Statusfile:
  // echo '<p>'.$MyName.', dein Zustandsdatensatz wird neu angelegt.</p>';
  $tDelay = 10;
  $bNew = true;
}

/********/

if ($bNew)
  $fSt = fopen($StFName, 'w');		// File neu anlegen
else
  $fSt = fopen($StFName, 'r+');		// zum Überschreiben oeffnen
$data = sprintf("%s;%d;%.3f;%.3f;%.3f;%.1f;%.1f;%.3f;",
        $jetzt, $state, $xPos, $yPos, $zPos, $xRot, $yRot, $vMov);
$data = str_pad($data, 72, ".");	// auf feste Laenge auffuellen
fprintf($fSt,$data); // Karl: DAZU!
fclose ($fSt);

//$lola1  = "&lon=".$iLon."&lat=".$iLat;
//echo $lola1."<br>";

$lola    = "&lon=$lon&lat=$lat";

$links = " <a target= \"_blank\" href=\"http://www.OSMgo.org?nol=1&user=karlos$lola\">go</a> ".
         " <a target= \"_blank\" href=\"http://www.OSMgo.org/map?$lola&user=karlos\">map</a> ";

if($llName) {
    //echo "llName:".$llName."<br>";
    $links .= $llName;
}

if($MyName!="karlos") {

    /////////////////// User-Login in Chat schreiben
    $fSt = fopen("user/st000.txt", 'r+');
    $onLine = sprintf("%s;1;%s is present;y;z;x;y;m;%d;chat;", $jetzt, $MyName, $secNow);
    fwrite($fSt, $onLine );
    fclose($fSt);

    /////////////////// und als Mail senden
    //$eintrag  = "<br><br>$zeit $datum<br>".
    //                    "FROM:$ip = $ipl<br><br>".
    //                    "TO: $links";
    //
    //$headers  = "MIME-Version: 1.0\n" ;
    //$headers .= "Content-Type: text/html; charset=\"iso-8859-1\"\n";
    //$headers .= "X-Priority: 1 (Highest)\n";
    //$headers .= "X-MSMail-Priority: High\n";
    //$headers .= "Importance: High\n";
    //$headers .= "From: OSMgo-Start <karlos@osmgo.org>\n";
    //$ret = mail("karlos@ac1000.de", "OSMgo used by: ".$ips , $eintrag, $headers);  // nur so geht es !?
}

echo $MyUserId.";".$MyName.";".$ips.";"."M0tndV9yQW5qT09SN2gxd1pMYktFdzpkYTJmZjkzYWQwNGIxY2Jk";
/**/
//echo "Ende<br>";
?>
