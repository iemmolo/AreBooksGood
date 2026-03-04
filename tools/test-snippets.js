// ── Give ores (paste into browser console) ──
var KEY = 'rpg-slot-1-skills';
var sk = JSON.parse(localStorage.getItem(KEY));
var ores = ['Copper Ore', 'Crimson Ore', 'Coal', 'Gold Ore', 'Iron Ore', 'Silver Ore', 'Astral Ore', 'Shadow Ore', 'Emerald Ore', 'Slate Ore', 'Mithril Ore', 'Amethyst Ore', 'Cobalt Ore', 'Molten Ore', 'Frost Ore', 'Obsidian Ore'];
for (var i = 0; i < ores.length; i++) { sk.inventory[ores[i]] = 99; }
localStorage.setItem(KEY, JSON.stringify(sk));
location.reload();


// ── Give bars (paste into browser console) ──
var KEY = 'rpg-slot-1-skills';
var sk = JSON.parse(localStorage.getItem(KEY));
var bars = ['Copper Bar', 'Bronze Bar', 'Gold Bar', 'Astral Bar', 'Silver Bar', 'Emerald Bar', 'Mithril Bar', 'Amethyst Bar', 'Cobalt Bar', 'Molten Bar', 'Frost Bar', 'Obsidian Bar'];
for (var i = 0; i < bars.length; i++) { sk.inventory[bars[i]] = 20; }
localStorage.setItem(KEY, JSON.stringify(sk));
location.reload();
