<?php
declare(strict_types=1);
const RARITIES = ['common'=>['chance'=>60,'price'=>1], 'rare'=>['chance'=>25,'price'=>2], 'epic'=>['chance'=>10,'price'=>4], 'legendary'=>['chance'=>4,'price'=>8], 'mythic'=>['chance'=>1,'price'=>20]];
function drawRarity(int $roll): string {
    foreach (RARITIES as $rarity=>$rule) { $roll -= $rule['chance']; if ($roll <= 0) return $rarity; }
    throw new InvalidArgumentException('Invalid roll');
}
