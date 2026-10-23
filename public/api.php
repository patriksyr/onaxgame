<?php
declare(strict_types=1);
require __DIR__.'/../app/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
date_default_timezone_set('Europe/Prague');
try {
$c=config();
session_name('onax_session');
session_set_cookie_params(['httponly'=>true,'secure'=>$c['secure_cookies']??true,'samesite'=>'Lax','path'=>rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME'])),'/').'/']);
ini_set('session.use_strict_mode','1'); session_start();
$_SESSION['csrf']??=bin2hex(random_bytes(32));
$action=$_GET['action']??'state';
$method=$_SERVER['REQUEST_METHOD'];
$writes=['register','login','logout','daily','buy','sell','admin_create','admin_toggle'];
if(in_array($action,$writes,true)) {
 if($method!=='POST') fail('Použij POST.',405);
 if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) fail('Platnost formuláře vypršela. Obnov stránku.',403);
}
$input=[];
if(str_contains($_SERVER['CONTENT_TYPE']??'','application/json')) {
 $input=json_decode(file_get_contents('php://input'),true,32,JSON_THROW_ON_ERROR);
 if(!is_array($input))fail('Neplatný požadavek.');
}
if($action==='state') respond(['user'=>currentUser(),'csrf'=>$_SESSION['csrf'],'catalog'=>cards(query('SELECT id,name,description,rarity,image FROM cards WHERE active=1 ORDER BY id')->fetchAll()),'rules'=>RARITIES]);
if($action==='register'||$action==='login') {
 throttle(); $name=trim((string)($input['username']??'')); $password=(string)($input['password']??'');
 if(!preg_match('/^[a-zA-Z0-9_]{3,24}$/D',$name))fail('Jméno musí mít 3–24 znaků: písmena bez diakritiky, čísla nebo podtržítko.');
 if(strlen($password)<8||strlen($password)>72)fail('Heslo musí mít 8–72 bajtů (u českých znaků může být limit kratší).');
 if($action==='register') {
  try { query('INSERT INTO users(username,password_hash) VALUES (?,?)',[$name,password_hash($password,PASSWORD_DEFAULT)]); } catch(PDOException $e) {if($e->getCode()==='23000')fail('Tohle jméno už někdo používá.',409);throw $e;}
  $_SESSION['uid']=(int)db()->lastInsertId();
 } else {
  $u=query('SELECT id,password_hash FROM users WHERE username=?',[$name])->fetch();
  $hash=$u['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi';
  if(!password_verify($password,$hash)||!$u)fail('Nesprávné jméno nebo heslo.',401);
  $_SESSION['uid']=(int)$u['id'];
 }
 session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32)); respond(['user'=>currentUser(),'csrf'=>$_SESSION['csrf']]);
}
if($action==='logout') { $_SESSION=[]; session_regenerate_id(true); $_SESSION['csrf']=bin2hex(random_bytes(32));respond(['csrf'=>$_SESSION['csrf']]); }
$u=currentUser(true); $uid=$u['id'];
if($action==='inventory') respond(['cards'=>cards(query('SELECT c.id,c.name,c.description,c.rarity,c.image,i.id AS inventory_id FROM inventory i JOIN cards c ON c.id=i.card_id WHERE i.user_id=? AND i.sold_at IS NULL ORDER BY i.id DESC',[$uid])->fetchAll())]);
if($action==='history') {
 $p=query('SELECT id FROM purchases WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 1',[$uid])->fetchColumn();
 respond(['cards'=>$p ? cards(query('SELECT c.id,c.name,c.description,c.rarity,c.image,i.id AS inventory_id FROM inventory i JOIN cards c ON c.id=i.card_id WHERE i.purchase_id=? ORDER BY i.id',[$p])->fetchAll()):[]]);
}
if($action==='daily') {
 $s=query('UPDATE users SET coins=coins+20,last_daily=? WHERE id=? AND (last_daily IS NULL OR last_daily<>?)',[date('Y-m-d'),$uid,date('Y-m-d')]);
 if(!$s->rowCount())fail('Dnešní odměnu už máš. Přijď zítra.',409);
 respond(['user'=>currentUser()]);
}
if($action==='buy') {
 $key=(string)($input['key']??''); if(!preg_match('/^[a-zA-Z0-9-]{16,64}$/D',$key))fail('Neplatný identifikátor nákupu.');
 db()->beginTransaction();
 $balance=(int)query('SELECT coins FROM users WHERE id=? FOR UPDATE',[$uid])->fetchColumn();
 $purchase=query('SELECT id FROM purchases WHERE user_id=? AND request_key=?',[$uid,$key])->fetchColumn();
 if(!$purchase) {
  $pool=[];foreach(query('SELECT id,rarity FROM cards WHERE active=1')->fetchAll() as $card)$pool[$card['rarity']][]=$card['id'];
  foreach(RARITIES as $rarity=>$rule) if(empty($pool[$rarity]))fail('Balíčky se připravují. Správce musí přidat alespoň jednu kartu každé rarity.',409);
  if($balance<10)fail('Nemáš dost mincí. Vyzvedni denní odměnu nebo prodej kartu.',409);
  $purchase=bin2hex(random_bytes(16));query('INSERT INTO purchases(id,user_id,request_key) VALUES (?,?,?)',[$purchase,$uid,$key]);
  query('UPDATE users SET coins=coins-10 WHERE id=?',[$uid]);
  for($i=0;$i<4;$i++) { $rarity=drawRarity(random_int(1,100)); $ids=$pool[$rarity]; query('INSERT INTO inventory(user_id,card_id,purchase_id) VALUES (?,?,?)',[$uid,$ids[random_int(0,count($ids)-1)],$purchase]); }
 }
 $result=cards(query('SELECT c.id,c.name,c.description,c.rarity,c.image,i.id AS inventory_id FROM inventory i JOIN cards c ON c.id=i.card_id WHERE i.purchase_id=? ORDER BY i.id',[$purchase])->fetchAll());
 db()->commit(); respond(['cards'=>$result,'user'=>currentUser()]);
}
if($action==='sell') {
 db()->beginTransaction(); query('SELECT id FROM users WHERE id=? FOR UPDATE',[$uid]);
 $item=query('SELECT i.id,c.rarity FROM inventory i JOIN cards c ON c.id=i.card_id WHERE i.id=? AND i.user_id=? AND i.sold_at IS NULL FOR UPDATE',[(int)($input['id']??0),$uid])->fetch();
 if(!$item)fail('Karta už byla prodaná nebo ti nepatří.',409);
 query('UPDATE inventory SET sold_at=NOW() WHERE id=?',[$item['id']]); query('UPDATE users SET coins=coins+? WHERE id=?',[RARITIES[$item['rarity']]['price'],$uid]); db()->commit();respond(['user'=>currentUser()]);
}
if(str_starts_with($action,'admin_')) {
 if(!$u['is_admin'])fail('Sem smí jen správce.',403);
 if($action==='admin_cards')respond(['cards'=>cards(query('SELECT * FROM cards ORDER BY id DESC')->fetchAll())]);
 if($action==='admin_toggle') {query('UPDATE cards SET active=NOT active WHERE id=?',[(int)($input['id']??0)]);respond(['ok'=>true]);}
 if($action==='admin_create') {
  $name=trim((string)($_POST['name']??'')); $desc=trim((string)($_POST['description']??'')); $rarity=$_POST['rarity']??'';
  if(mb_strlen($name)<1||mb_strlen($name)>80||mb_strlen($desc)>500||!isset(RARITIES[$rarity]))fail('Zkontroluj název, popis a raritu.');
  $f=$_FILES['image']??null; if(!$f||$f['error']!==UPLOAD_ERR_OK||$f['size']>5*1024*1024)fail('Nahraj JPG, PNG nebo WebP do 5 MB.');
  $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);$ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime]??null;
  $size=@getimagesize($f['tmp_name']);if(!$ext||!$size||$size[0]>6000||$size[1]>6000)fail('Neplatný obrázek nebo rozměry nad 6000 px.');
  $path='uploads/'.bin2hex(random_bytes(20)).'.'.$ext;
  if(!move_uploaded_file($f['tmp_name'],__DIR__.'/'.$path))throw new RuntimeException('Upload directory is not writable');
  try{query('INSERT INTO cards(name,description,rarity,image) VALUES (?,?,?,?)',[$name,$desc,$rarity,$path]);}catch(Throwable $e){unlink(__DIR__.'/'.$path);throw $e;}
  respond(['ok'=>true]);
 }
}
fail('Požadavek neexistuje.',404);
} catch(JsonException $e) {if(isset($GLOBALS['db'])&&db()->inTransaction())db()->rollBack();fail('Neplatná data.');}
catch(Throwable $e) { error_log((string)$e); http_response_code(503); echo json_encode(['error'=>'Server není připravený. Zkontrolujte databázi a konfiguraci podle návodu.'],JSON_UNESCAPED_UNICODE); }
