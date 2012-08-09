<?php
  echo file_get_contents(
     $_REQUEST['url']
    ,false
    ,stream_context_create(array('http' => array(
       'method'  => 'POST'
      ,'header'  => 'Content-type: text/xml'
      ,'content' => $HTTP_RAW_POST_DATA
    )))
  );
?>
