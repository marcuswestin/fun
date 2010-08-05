<?php
    $grammar = isset($_GET['grammar']) ? "grammar=" . $_GET['grammar'] : '';
    $code = isset($_GET['code']) ? "code=fun_code/" . $_GET['code'] : '';
    $verbose = isset($_GET['verbose']) ? "verbose=true" : "verbose=false";
    
    $output = array();
    $exec = "/usr/local/bin/node parse_and_run.js $grammar $code $verbose";
    exec($exec, $output);
    echo implode($output, "\n");
?>