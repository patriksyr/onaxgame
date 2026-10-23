<?php
// Zkopírujte jako config.local.php. Tento soubor nepatří na GitHub.
return [
    'dsn' => 'mysql:host=127.0.0.1;port=3306;dbname=onax;charset=utf8mb4',
    'user' => 'onax',
    'password' => 'DOPLNTE_HESLO_DATABAZE',
    // Dočasný dlouhý náhodný řetězec pro /public/setup.php. Po instalaci nastavte ''.
    'setup_token' => '',
    'secure_cookies' => true, // false pouze při lokálním vývoji přes HTTP
];
