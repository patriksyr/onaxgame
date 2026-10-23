<?php
declare(strict_types=1);
require_once __DIR__.'/rules.php';
function config(): array {
    $path = getenv('ONAX_CONFIG') ?: __DIR__.'/config.local.php';
    if (!is_file($path)) throw new RuntimeException('Chybí konfigurace serveru. Postup najdete v README.');
    return require $path;
}
function db(): PDO {
    static $db;
    if (!$db) { $c=config(); $db=new PDO($c['dsn'],$c['user'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]); }
    return $db;
}
function query(string $sql, array $params=[]): PDOStatement { $s=db()->prepare($sql); $s->execute($params); return $s; }
function respond(array $data,int $status=200): never { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR); exit; }
function fail(string $message,int $status=400): never { respond(['error'=>$message],$status); }
function currentUser(bool $required=false): ?array {
    $u=isset($_SESSION['uid']) ? query('SELECT id,username,coins,is_admin,last_daily FROM users WHERE id=?',[$_SESSION['uid']])->fetch() : false;
    if (!$u && $required) fail('Nejdřív se přihlas.',401);
    if (!$u) return null;
    $u['coins']=(int)$u['coins']; $u['is_admin']=(bool)$u['is_admin']; $u['daily_available']=$u['last_daily']!==date('Y-m-d'); unset($u['last_daily']); return $u;
}
function cards(array $rows): array {
    return array_map(function($c) { $c['id']=(int)$c['id']; $c['price']=RARITIES[$c['rarity']]['price']; if(isset($c['inventory_id']))$c['inventory_id']=(int)$c['inventory_id']; return $c; },$rows);
}
function throttle(): void {
    $ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'local'); $now=time();
    query('INSERT INTO auth_attempts(ip_hash,attempts,window_start) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(window_start < ?,1,attempts+1),window_start=IF(window_start < ?,VALUES(window_start),window_start)',[$ip,$now,$now-900,$now-900]);
    if((int)query('SELECT attempts FROM auth_attempts WHERE ip_hash=?',[$ip])->fetchColumn()>30) fail('Příliš mnoho pokusů. Zkus to za 15 minut.',429);
}
