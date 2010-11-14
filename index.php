<?php
$exec = "/usr/local/bin/node language/run.js";
exec($exec, $output);
echo "<!doctype html>\n<html>\n<head></head>\n<body>"
	. "\n<script src='lib/fin/fin.js'></script>"
	. "\n<script src='language/lib.js'></script>"
	. "<script>\n" . implode($output, "\n") . "\n</script>\n</body>\n</html>";
?>
