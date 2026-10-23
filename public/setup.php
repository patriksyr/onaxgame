<?php
declare(strict_types=1);
require __DIR__.'/../app/bootstrap.php';
header('X-Frame-Options: DENY');header('Cache-Control: no-store');
$error='';$success=false;
try {
 $c=config();
 if(empty($c['setup_token'])) {http_response_code(403);exit('Instalátor je vypnutý. Nastavte dočasný setup_token v app/config.local.php podle README.');}
 if(query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='users'")->fetchColumn()>0) {http_response_code(403);exit('Databáze je již inicializovaná. Instalátor je uzamčený.');}
 if($_SERVER['REQUEST_METHOD']==='POST') {
  if(!hash_equals($c['setup_token'],(string)($_POST['token']??'')))throw new RuntimeException('Nesprávný instalační klíč.');
  $name=trim((string)($_POST['username']??''));$pass=(string)($_POST['password']??'');
  if(!preg_match('/^[a-zA-Z0-9_]{3,24}$/D',$name)||strlen($pass)<12||strlen($pass)>72)throw new RuntimeException('Jméno: 3–24 znaků bez diakritiky. Heslo: 12–72 bajtů.');
  foreach(explode(';',file_get_contents(__DIR__.'/../app/schema.sql')) as $sql)if(trim($sql)!=='')db()->exec($sql);
  query('INSERT INTO users(username,password_hash,is_admin) VALUES (?,?,1)',[$name,password_hash($pass,PASSWORD_DEFAULT)]);$success=true;
 }
} catch(Throwable $e){error_log((string)$e);$error=$e instanceof PDOException?'Databáze není dostupná nebo instalace selhala. Zkontrolujte konfiguraci a serverový log.':$e->getMessage();}
?>
<!doctype html><html lang="cs"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Instalace Onax</title><style>body{background:#101210;color:#f5f1d4;font:16px system-ui;max-width:520px;margin:80px auto;padding:24px}input,button{display:block;box-sizing:border-box;width:100%;padding:14px;margin:12px 0;border-radius:8px}button{background:#e6ef9a;border:0;font-weight:bold}a{color:#e6ef9a}</style><h1>ROLL AN ONAX / instalace</h1>
<?php if($success): ?><p>Hotovo. Správce je vytvořený. V config.local.php nyní nastavte setup_token na prázdný řetězec a odstraňte setup.php ze serveru.</p><a href="./">Přejít na web</a>
<?php else: ?><p>Vytvořte účet správce. Instalace založí prázdný katalog; poté nahrajte alespoň jednu kartu od každé rarity.</p><p role="alert"><?=htmlspecialchars($error,ENT_QUOTES,'UTF-8')?></p><form method="post"><label>Instalační klíč<input type="password" name="token" required autocomplete="off"></label><label>Jméno správce<input name="username" required pattern="[a-zA-Z0-9_]{3,24}" autocomplete="username"></label><label>Heslo správce (alespoň 12 znaků)<input type="password" name="password" minlength="12" maxlength="72" required autocomplete="new-password"></label><button>Vytvořit databázi a správce</button></form><?php endif ?></html>
