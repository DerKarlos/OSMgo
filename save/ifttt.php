<?php
//echo "Start";

$status = $_GET['status'];
//echo " status:$status";
//$bodyx   = http_get_request_body();
$body = $_REQUEST['CONTENT'];
//echo " body:$body";
        $fLog = fopen("ifttt.txt", 'a');
fprintf($fLog, "Status:'$status' Body:'$body'<br>\n");
fclose( $fLog);

//echo "End";
?>
