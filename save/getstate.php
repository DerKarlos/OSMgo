<?php

$Version = "2016-02-17";

$maxUser = 50;                          // Anzahl der User vorerst begrenzen
$lenQuad = 200000000;                         // Kantenlaenge einer Kachel
$lenQuad2 = 100;                        // halbe Kantenlaenge
$defScript = "w0.js";                   // Default-Tile-Script

date_default_timezone_set('Europe/Berlin');


//---------------------------------------------------------------------------
// Liste der Namen anlegen

$UsFName = 'user/user.txt';
$fUs = fopen($UsFName, 'r') or exit('*** Kann '.$UsFName.' nicht oeffnen');

$names = array();
$id = 0;
while (!feof($fUs)) {
    $line = rtrim(fgets($fUs));
    if ((strlen($line) > 1) && (substr($line, 0, 1) == "#"))
        continue;
    if (strlen($line) < 22)
        break;

// 2015-11-17 20:00;0;Mustermann;
    $items = explode(";", $line);
    $names[$id] = $items[2];
    $id++;
}


$jetzt = date("Y-m-d").' '.date("H:i:s");
$dNow = sscanf ($jetzt, "%d-%d-%d %d:%d:%d");
$yrNow = $dNow % 100;
$secNow = (((($yrNow*12 + $dNow[1])*30 + $dNow[2])*24 + $dNow[3])*60 + $dNow[4])*60 + $dNow[5];


//---------------------------------------------------------------------------
// Nachschauen, wer gerade online ist für aktuelle Anzeige auf Startseite

if (isset($_GET['poll'])) {
    $result = "";
    for ($id = 1; $id < $maxUser; $id++) {
        $fName = sprintf("user/st%03u.txt", $id);
        if (!file_exists($fName))
            continue;
        $fSt = fopen($fName, 'r');
        $usrTim = fread($fSt, 20);  // "2016-01-20 14:36:55;"
  //    echo " echo:".$usrTim;
        $stat = fread($fSt, 1);
        fclose ($fSt);
        if ($stat == "1") {
            $dUsr = sscanf ($usrTim, "%d-%d-%d %d:%d:%d");
            $yrUsr = $dUsr % 100;
            $sec1 = (((($yrUsr*12 + $dUsr[1])*30 + $dUsr[2])*24 + $dUsr[3])*60 + $dUsr[4])*60 + $dUsr[5];
            if ($sec1 < $secNow - 120) {    // laenger als 2 Minuten passiv
                // diesen User abmelden: Zustand auf passiv setzen
                $fSt = fopen($fName, 'r+'); // zum Ueberschreiben oeffnen
                fseek($fSt, 20, SEEK_SET);  // hinter die Uhrzeit positionieren
                fwrite($fSt, "0", 1);
                fclose ($fSt);
                // im Protokoll vermerken
                $LogName = sprintf("user/log_%02d%02d.txt", date("y")%100, date("n"));
                $fLog = fopen($LogName, 'a');
                fprintf($fLog, "Logoff: %s; ID %d\r\n", $items[0], $id);
                continue;
            }
            $result = $result."  ".$names[$id];
        }
    }
/*  if ($result == "")
        echo 'poll|(niemand online)';
    else
        echo 'poll|<b>ONLINE:</b>'.$result;  */
    return;
}



//-----------------------------------------------------------------------------
// Zustand aller User sammeln und anzeigen
// Zeilen in einem Array sammeln, spaeter nach Zeit sortiert ausgeben

/*
$wrlName = "../world/world.txt";
$filetext = "";
if (file_exists($wrlName)) {
    $fw = fopen($wrlName, "r");
    $filetext = fread($fw, filesize($wrlName));
    fclose($fw);
} else {
    echo '*** Kein world.txt gefunden.';
    return;
}
*/

$uLines = array();
$uSec = array();
$uCnt = 0;

for ($id = 1; $id < $maxUser; $id++) {
    $fName = sprintf("user/st%03u.txt", $id);
    if (!file_exists($fName))
        continue;
    $fSt = fopen($fName, 'r');
    $line = fgets($fSt);
    fclose ($fSt);

// Aufbau der Zeile: $jetzt, $state, $xPos, $yPos, $zPos, $xRot, $yRot, $vMov, $sec

    if (strlen($line) < 60)
        continue;				// ungültig

    $items = explode(";", $line);
    $xPos = $items[2];
    $zPos = $items[4];
    $wKachel = sprintf("w%02d%02d", intval(($xPos+$lenQuad2)/$lenQuad + 50),
                                    intval(($zPos+$lenQuad2)/$lenQuad + 50));
    $wScript = $defScript;
    if ($filetext != "") {
        $pos = strpos($filetext, $wKachel.':');
        if ($pos > 0) {
            $pos += 6;
            $pos1 = strpos($filetext, ",", $pos);
            $pos2 = strpos($filetext, "\n", $pos);
            if (($pos1 > 0) && ($pos1 < $pos2))
                $wScript = trim(substr($filetext, $pos, $pos1-$pos));
            else
                $wScript = trim(substr($filetext, $pos, $pos2-$pos));
        }
    }
    $VersTxt = "V??";
    $fName = "../world/".$wScript;
    if (!file_exists($fName))
        $VersTxt = $fName." nicht gefunden";
    else {
        $fd = fopen($fName, 'r');
        $ftext = fread($fd, filesize($fName));
        $pos = strpos($ftext, "SceneVersion");
        if ($pos > 0) {
            $pos = strpos($ftext, "\"", $pos+6);
            if ($pos > 0) {
                $vLine = substr($ftext, $pos);			
                $pos2 = strpos($vLine, "\"", 1);
                $VersTxt = substr($vLine, 0, $pos2+1);
            }
        }
        fclose ($fd);
    }

    $sts = "0";
    if ($items[1] != "0")
        $sts = "active";

    $uSec[$uCnt] = $items[8];
    $uLines[$uCnt] = '<tr align="center"><td>'.$id."</td><td>"
        .$names[$id]."</td><td>"
        .$sts."</td><td>"
        .$items[0]."</td><td>"
        .$xPos.' / '.$zPos."</td><td>"
        .$items[6].'</td><td align="left">'
        .$wKachel." / ".$VersTxt."</td></tr>\r\n";
    $uCnt++;
}

echo '<!DOCTYPE html>';
echo '<html><head><meta charset="utf-8"></head>';
echo '<body>';
echo '<font face="Tahoma" size="2">';
echo '<h3>Liste der Besucher</h3>';
echo '<table border="1" cellpadding="2" bgcolor="#EEEEFF">';
echo '<tr align="center"><td><b>User-ID</b></td><td><b>Name</b></td><td><b>Status</b></td>';
echo '<td><b>zuletzt aktiv</b></td><td><b>Position</b></td><td><b>Rotation</b></td><td><b>Kachel</b></td></tr>';

for ($i = 0; $i < $uCnt; $i++) {
    $secMax = 0;
    $numMax = 0;
    for ($j = 0; $j < $uCnt; $j++) {
        if ($uSec[$j] == 0)
            continue;
        if ($uSec[$j] > $secMax) {
            $secMax = $uSec[$j];
            $numMax = $j;
        }
    }
    if ($secMax > 0) {
        echo $uLines[$numMax];
        $uSec[$numMax] = 0;
    }
}

echo '</table>';
echo '<br /><hr><p><small><i>'.$Version.'</i></small></p>';
echo '</body></html>';
?>
