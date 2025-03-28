<?php
// Принудительное перенаправление на Render
header("HTTP/1.1 301 Moved Permanently");
header("Location: https://domgors.onrender.com" . $_SERVER['REQUEST_URI']);
exit;
?>
