from __future__ import annotations

COSMETICS: dict[str, dict] = {
    "card_midnight": {"category": "card_skin", "price": 500, "css_class": "skin-card-midnight"},
    "card_royal": {"category": "card_skin", "price": 1000, "css_class": "skin-card-royal"},
    "card_sakura": {"category": "card_skin", "price": 2000, "css_class": "skin-card-sakura"},
    "dice_jade": {"category": "dice_skin", "price": 500, "css_class": "skin-dice-jade"},
    "dice_obsidian": {"category": "dice_skin", "price": 1000, "css_class": "skin-dice-obsidian"},
    "dice_golden": {"category": "dice_skin", "price": 2000, "css_class": "skin-dice-golden"},
    "table_crimson": {"category": "table_theme", "price": 1000, "css_class": "theme-crimson"},
    "table_midnight": {"category": "table_theme", "price": 2000, "css_class": "theme-midnight"},
    "table_royal": {"category": "table_theme", "price": 5000, "css_class": "theme-royal"},
    # Achievement reward skins (price=0, unlocked via achievements)
    "card_champion": {"category": "card_skin", "price": 0, "css_class": "skin-card-champion", "achievement": "wins_100"},
    "dice_streak": {"category": "dice_skin", "price": 0, "css_class": "skin-dice-streak", "achievement": "streak_10"},
    "table_veteran": {"category": "table_theme", "price": 0, "css_class": "theme-veteran", "achievement": "hands_1000"},
}


def get_catalog() -> list[dict]:
    return [{"id": k, **v} for k, v in COSMETICS.items()]


def validate_purchase(item_id: str, user: dict) -> str | None:
    """Return error message or None if purchase is valid."""
    if item_id not in COSMETICS:
        return "Item not found"
    item = COSMETICS[item_id]
    if item["price"] == 0:
        return "Unlock via achievement"
    owned = user.get("owned_cosmetics", {})
    if item_id in owned:
        return "Already owned"
    if user.get("coins", 0) < item["price"]:
        return "Not enough coins"
    return None


def validate_equip(item_id: str | None, category: str, user: dict) -> str | None:
    """Return error message or None if equip/unequip is valid."""
    if item_id is None:
        if category not in ("card_skin", "dice_skin", "table_theme"):
            return "Invalid category"
        return None
    if item_id not in COSMETICS:
        return "Item not found"
    if COSMETICS[item_id]["category"] != category:
        return "Category mismatch"
    item = COSMETICS[item_id]
    if "achievement" in item:
        unlocked = user.get("unlocked_achievements", {})
        if item["achievement"] not in unlocked:
            return "Achievement not unlocked"
        return None
    owned = user.get("owned_cosmetics", {})
    if item_id not in owned:
        return "Item not owned"
    return None


# Reverse mapping: achievement_id -> cosmetic_id
ACHIEVEMENT_COSMETICS: dict[str, str] = {
    item["achievement"]: item_id
    for item_id, item in COSMETICS.items()
    if "achievement" in item
}
