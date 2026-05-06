"""Tests for the cosmetics shop system."""

from __future__ import annotations

import pytest

from backend.cosmetics import ACHIEVEMENT_COSMETICS, COSMETICS, get_catalog, validate_equip, validate_purchase


class TestCatalog:
    def test_catalog_returns_all_items(self):
        catalog = get_catalog()
        assert len(catalog) == len(COSMETICS)

    def test_catalog_items_have_required_fields(self):
        for item in get_catalog():
            assert "id" in item
            assert "category" in item
            assert "price" in item
            assert "css_class" in item

    def test_catalog_categories(self):
        categories = {item["category"] for item in get_catalog()}
        assert categories == {"card_skin", "dice_skin", "table_theme"}

    def test_all_prices_non_negative(self):
        for item in get_catalog():
            assert item["price"] >= 0

    def test_purchasable_items_have_positive_price(self):
        for item in get_catalog():
            if "achievement" not in item:
                assert item["price"] > 0

    def test_all_css_classes_non_empty(self):
        for item in get_catalog():
            assert len(item["css_class"]) > 0


class TestValidatePurchase:
    def _user(self, coins=5000, owned=None):
        return {
            "coins": coins,
            "owned_cosmetics": owned or {},
        }

    def test_valid_purchase(self):
        assert validate_purchase("card_midnight", self._user(coins=500)) is None

    def test_not_enough_coins(self):
        assert validate_purchase("card_midnight", self._user(coins=100)) == "Not enough coins"

    def test_already_owned(self):
        user = self._user(owned={"card_midnight": "2025-01-01"})
        assert validate_purchase("card_midnight", user) == "Already owned"

    def test_item_not_found(self):
        assert validate_purchase("nonexistent", self._user()) == "Item not found"

    def test_exact_coins_for_purchase(self):
        price = COSMETICS["card_midnight"]["price"]
        assert validate_purchase("card_midnight", self._user(coins=price)) is None

    def test_one_coin_short(self):
        price = COSMETICS["card_midnight"]["price"]
        assert validate_purchase("card_midnight", self._user(coins=price - 1)) == "Not enough coins"


class TestValidateEquip:
    def _user(self, owned=None, equipped=None):
        return {
            "owned_cosmetics": owned or {},
            "equipped": equipped or {},
        }

    def test_equip_owned_item(self):
        user = self._user(owned={"card_midnight": "2025-01-01"})
        assert validate_equip("card_midnight", "card_skin", user) is None

    def test_equip_unowned_item(self):
        user = self._user()
        assert validate_equip("card_midnight", "card_skin", user) == "Item not owned"

    def test_equip_wrong_category(self):
        user = self._user(owned={"card_midnight": "2025-01-01"})
        assert validate_equip("card_midnight", "dice_skin", user) == "Category mismatch"

    def test_equip_nonexistent_item(self):
        user = self._user()
        assert validate_equip("nonexistent", "card_skin", user) == "Item not found"

    def test_unequip_valid_category(self):
        user = self._user()
        assert validate_equip(None, "card_skin", user) is None

    def test_unequip_invalid_category(self):
        user = self._user()
        assert validate_equip(None, "invalid_cat", user) == "Invalid category"

    def test_equip_each_category(self):
        for item_id, item in COSMETICS.items():
            if "achievement" in item:
                user = self._user()
                user["unlocked_achievements"] = {item["achievement"]: "2025-01-01"}
            else:
                user = self._user(owned={item_id: "2025-01-01"})
            assert validate_equip(item_id, item["category"], user) is None


class TestCosmeticsIntegrity:
    """Verify catalog data consistency."""

    def test_css_class_prefixes(self):
        for item_id, item in COSMETICS.items():
            cat = item["category"]
            css = item["css_class"]
            if cat == "card_skin":
                assert css.startswith("skin-card-")
            elif cat == "dice_skin":
                assert css.startswith("skin-dice-")
            elif cat == "table_theme":
                assert css.startswith("theme-")

    def test_unique_css_classes(self):
        classes = [item["css_class"] for item in COSMETICS.values()]
        assert len(classes) == len(set(classes))

    def test_unique_ids(self):
        catalog = get_catalog()
        ids = [item["id"] for item in catalog]
        assert len(ids) == len(set(ids))


class TestAchievementCosmetics:
    """Tests for achievement-gated cosmetics."""

    def test_achievement_items_have_zero_price(self):
        for item_id, item in COSMETICS.items():
            if "achievement" in item:
                assert item["price"] == 0, f"{item_id} should be free"

    def test_purchase_rejected_for_achievement_items(self):
        user = {"coins": 99999, "owned_cosmetics": {}}
        assert validate_purchase("card_champion", user) == "Unlock via achievement"
        assert validate_purchase("dice_streak", user) == "Unlock via achievement"
        assert validate_purchase("table_veteran", user) == "Unlock via achievement"

    def test_equip_achievement_item_with_unlocked_achievement(self):
        user = {
            "owned_cosmetics": {},
            "unlocked_achievements": {"wins_100": "2025-01-01"},
        }
        assert validate_equip("card_champion", "card_skin", user) is None

    def test_equip_achievement_item_without_achievement(self):
        user = {
            "owned_cosmetics": {},
            "unlocked_achievements": {},
        }
        assert validate_equip("card_champion", "card_skin", user) == "Achievement not unlocked"

    def test_equip_achievement_item_no_unlocked_field(self):
        user = {"owned_cosmetics": {}}
        assert validate_equip("card_champion", "card_skin", user) == "Achievement not unlocked"

    def test_achievement_cosmetics_reverse_mapping(self):
        assert ACHIEVEMENT_COSMETICS["wins_100"] == "card_champion"
        assert ACHIEVEMENT_COSMETICS["streak_10"] == "dice_streak"
        assert ACHIEVEMENT_COSMETICS["hands_1000"] == "table_veteran"

    def test_regular_items_still_check_owned(self):
        """Non-achievement items should still use owned_cosmetics."""
        user = {"coins": 5000, "owned_cosmetics": {"card_midnight": "2025-01-01"}}
        assert validate_equip("card_midnight", "card_skin", user) is None
        user_no_own = {"coins": 5000, "owned_cosmetics": {}}
        assert validate_equip("card_midnight", "card_skin", user_no_own) == "Item not owned"
