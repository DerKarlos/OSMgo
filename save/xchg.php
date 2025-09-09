<?php

//echo "START<br>";

$MAX_USER = 300;
$TIMEOUT  = 30;

date_default_timezone_set('Europe/Berlin');

$now    = new DateTime();
$jetzt  = $now->format('Y-m-d H:i:s');
$secNow = $now->format('U');
$logNow = $now->format('_m_d_H');
//echo "now:$jetzt $secNow<br>";

if (isset(  $_GET['note'])) {
    $text = $_GET['note'];
    $fNote = fopen("user/notes.txt", 'a');
    fprintf($fNote, "$jetzt;$text<br>\n");
    //echo       "NOTE:$jetzt;$text<br>\n";
    fclose( $fNote);
}


if (isset(  $_GET['chat'])) {
    $text = $_GET['chat'];
    $fSt = fopen("user/st000.txt", 'w'); // r+              Diese Zeichen gehen nicht:  ;+&
    $line = sprintf("%s;1;%s;y;z;x;y;m;%d;CHAT;",
           $jetzt,         $text, $secNow);
        // $jetzt, $state, $xPos, $yPos, $zPos, $xRot, $yRot, $vMov, $secNow, $sNam);

    //echo "CHAT:$line<br>";
    fwrite($fSt, $line);
    fclose($fSt);

    // $LogName = sprintf("user/log_%02d%02d.htm", date("y") % 100, date("n"));
    // $fLog = fopen($LogName, 'a');
    // fprintf($fLog, "%s Chat %s<br>\n", $jetzt, $text);
}


if (isset($_GET['pos'])) {

  $myPosi = $_GET['pos'];
  //echo "*** posi:".$myPosi."<br>";
  $items  = explode(";", $myPosi);
  $myId   = intval($items[0]);
  $ip     = getenv("REMOTE_ADDR");
  //echo "myId:$myId $myPosi<br>";

  ///// 1/3: Das eigene Statusfile zum Ueberschreiben oeffnen und aktualisieren
  if($myId>0) {

      //    osmgo.org/xchg.php?pos=1id;1xLon;2yzLat;3zEle;4rxView;5ryDir;6mov;name;log
      $xPos = floatval($items[1]);
      $yPos = floatval($items[2]);
      $zPos = floatval($items[3]);
      $xRot = floatval($items[4]);
      $yRot = floatval($items[5]);
      $vMov = floatval($items[6]);
      $sNam =          $items[7] ;
      $log  =          $items[8] ;
      //echo "sNam:".$sNam."<br>";

      $state  = 1; // active


      $myLine = sprintf("%s;%d;%.6f;%.6f;%.2f;%.1f;%.1f;%.3f;%d;$sNam;",
            $jetzt, $state, $xPos, $yPos, $zPos, $xRot, $yRot, $vMov, $secNow);
    //$myLine = str_pad($myLine, 90, "-");	// auf feste Laenge auffuellen

      $StFName = sprintf("user/st%03u.txt", $myId);
      $fSt = fopen($StFName, 'r+');
      fwrite($fSt, $myLine);
      fclose($fSt);

    //  if($sNam != "karlos") {
      $fIP = fopen("user/".$ip.$logNow.".log", 'a');
      fwrite($fIP, $myLine.$log."<br>\n");
      fclose($fIP);
    //  }

  }//id>0


  $first = false;
  if (isset($_GET['first']))
    $first = true;
  
 
  $result = "pos|";
  // $fLog = 0;

  for ($id = 0; $id < $MAX_USER; $id++) {

    $fName = sprintf ("user/st%03u.txt", $id);
    if (!file_exists($fName))
        continue;

    $fSt = fopen($fName, 'r');
    $line = fgets($fSt);
    //echo "USER-Line:$line<br>";
    fclose ($fSt);
    if (strlen($line) < 20)
      continue;
    $items = explode(";", $line);
 
    ///// 2/3: Prüfen ob User länger passiv ist und ggf. auf "gone" setzen
    
    // die ID des Users voranstellen, relative Zeit hinten
    $limit = $TIMEOUT;
    if($id==0) 
        $limit = 15;
    
    if ($items[1] == "1") 			// User ist noch aktiv
    {
        // echo "items[0]:$items[0]<br>";
        $tUsr = new DateTime($items[0]);
        $sec1 = $tUsr->format('U');
        //echo "sec1:$sec1 $secNow $limit<br>";
        
        if ($sec1 <= $secNow - $limit)	// ca. 0.5 Minute
        {   // User ist weg
            //echo "tot $id != $myId?<br>";
            if (($id != $myId)||($id==0)) {
                //echo "nicht ich oder 0<br>";

                // diesen User abmelden: Zustand auf passiv setzen
                $fSt = fopen($fName, 'r+');		// zum Ueberschreiben oeffnen
                fseek( $fSt, 20, SEEK_SET);		// hinter die Uhrzeit positionieren
                fwrite($fSt, "0", 1);
                fclose($fSt);

                if($id != 0) {
                    $fSt = fopen("user/st000.txt", 'r+');
                    $offLine = sprintf("%s;1;%s is gone;y;z;x;y;m;%d;chat;", $jetzt, $items[9], $secNow);
                    fwrite($fSt, $offLine );
                    fclose($fSt);
                }

                // im Protokoll vermerken
                // if ($fLog == 0) {
                //   $LogName = sprintf("user/log_%02d%02d.htm", date("y") % 100, date("n"));
                //   $fLog    = fopen($LogName, 'a');
                // }
                // if($id!=0) {
                //     fprintf($fLog, "%s Logoff : ID:$id (by ID $myId)<br>\n", $items[0]);
                // }
            }//id=my
        }//gone
    }//atkiv



    ///// 3/3: Alle anderen Statusfiles lesen, Ergebnistext zusammenbauen (und am Ende senden)
 
    $secUsr = 3*24*3600; 
    if (isset($items[8])) {
      $sec1 = intval($items[8]);
      if ($sec1 > $secNow/2)
        $secUsr = $secNow - $sec1;
    }

    if($id==0)
        $items[3] = $ip;    // User 0 (Chat): add IP of requester

    $result = $result.$id.";".$items[0].";".$items[1].";".$items[2].";".$items[3].";"
                             .$items[4].";".$items[5].";".$items[6].";".$items[7].";".$secUsr.";".$items[9]."|";


  }//for all users

  // if ($fLog != 0)
  //   fclose($fLog);
  echo $result;
  return;
}



//echo "END<br>";
?>
