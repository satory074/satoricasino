import type { EquippedCosmetics } from "./types/game";

const COSMETICS_CSS: Record<string, string> = {
  card_midnight: "skin-card-midnight",
  card_royal: "skin-card-royal",
  card_sakura: "skin-card-sakura",
  dice_jade: "skin-dice-jade",
  dice_obsidian: "skin-dice-obsidian",
  dice_golden: "skin-dice-golden",
  table_crimson: "theme-crimson",
  table_midnight: "theme-midnight",
  table_royal: "theme-royal",
};

export { COSMETICS_CSS };

export function getCardSkinClass(equipped?: EquippedCosmetics): string | undefined {
  const id = equipped?.card_skin;
  return id ? COSMETICS_CSS[id] : undefined;
}

export function getDiceSkinClass(equipped?: EquippedCosmetics): string | undefined {
  const id = equipped?.dice_skin;
  return id ? COSMETICS_CSS[id] : undefined;
}

export function getTableThemeClass(equipped?: EquippedCosmetics): string | undefined {
  const id = equipped?.table_theme;
  return id ? COSMETICS_CSS[id] : undefined;
}
