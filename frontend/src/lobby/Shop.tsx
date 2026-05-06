import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { apiGet, apiPost } from "../shared/api/api";
import { useTranslation } from "../shared/i18n/useTranslation";
import type { CosmeticItem, EquippedCosmetics } from "../shared/types/game";
import { Card } from "../shared/components/Card";
import { Die } from "../games/chinchiro/Die";

interface ShopResponse {
  items: (CosmeticItem & { owned: boolean; equipped: boolean })[];
  equipped: EquippedCosmetics;
  coins: number;
}

type Category = "card_skin" | "dice_skin" | "table_theme";

const CATEGORIES: { value: Category; labelKey: string }[] = [
  { value: "card_skin", labelKey: "shop.categories.card_skin" },
  { value: "dice_skin", labelKey: "shop.categories.dice_skin" },
  { value: "table_theme", labelKey: "shop.categories.table_theme" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCoinsChanged: (coins: number, delta: number) => void;
  play: (id: "button_click" | "bonus") => void;
}

export function Shop({ open, onClose, onCoinsChanged, play }: Props) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category>("card_skin");
  const [data, setData] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<ShopResponse>("/api/shop");
      setData(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleBuy = async (itemId: string, price: number) => {
    play("button_click");
    try {
      const result = await apiPost<{ coins: number; item_id: string }>(
        `/api/shop/buy?item_id=${encodeURIComponent(itemId)}`,
        {},
      );
      onCoinsChanged(result.coins, -price);
      play("bonus");
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.55 },
        colors: ["#f4c430", "#ffd84a", "#c41e3a"],
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleEquip = async (itemId: string | null, cat: Category) => {
    play("button_click");
    try {
      const params = itemId
        ? `item_id=${encodeURIComponent(itemId)}&category=${encodeURIComponent(cat)}`
        : `category=${encodeURIComponent(cat)}`;
      await apiPost(`/api/shop/equip?${params}`, {});
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  const filteredItems = data?.items.filter((item) => item.category === category) ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-card shop-card"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">{t("shop.title")}</div>
            {data && (
              <div className="shop-coins">
                {data.coins.toLocaleString()} coins
              </div>
            )}

            <div className="leaderboard-tabs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  className={`lb-tab${category === cat.value ? " active" : ""}`}
                  onClick={() => setCategory(cat.value)}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>

            {loading && !data ? (
              <div className="leaderboard-loading">...</div>
            ) : (
              <div className="shop-grid">
                {filteredItems.map((item) => (
                  <div key={item.id} className={`shop-item ${item.css_class}`}>
                    <div className="shop-item-preview">
                      {item.category === "card_skin" ? (
                        <Card card={{ suit: "\u2660", rank: "A" }} index={0} skinClass={item.css_class} />
                      ) : item.category === "dice_skin" ? (
                        <Die face={6} skinClass={item.css_class} />
                      ) : (
                        <div className={`shop-preview-swatch ${item.css_class}`} />
                      )}
                    </div>
                    <div className="shop-item-name">
                      {t(`shop.items.${item.id}`)}
                    </div>
                    {item.price > 0 ? (
                      <div className="shop-item-price">
                        {item.price.toLocaleString()} coins
                      </div>
                    ) : (
                      <div className="shop-item-price shop-item-achievement">
                        {item.owned ? t("achievements.unlocked") : t("shop.achievementLock", { name: t(`achievements.${item.achievement ?? ""}`) })}
                      </div>
                    )}
                    {item.owned ? (
                      item.equipped ? (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleEquip(null, item.category as Category)}
                        >
                          {t("shop.equipped")}
                        </button>
                      ) : (
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleEquip(item.id, item.category as Category)}
                        >
                          {t("shop.equip")}
                        </button>
                      )
                    ) : item.price === 0 ? (
                      <button className="btn-secondary btn-sm" disabled>
                        🔒
                      </button>
                    ) : (
                      <button
                        className="btn-primary btn-sm"
                        disabled={(data?.coins ?? 0) < item.price}
                        onClick={() => handleBuy(item.id, item.price)}
                      >
                        {t("shop.buy")} ({item.price})
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button className="btn-primary" onClick={onClose}>
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
