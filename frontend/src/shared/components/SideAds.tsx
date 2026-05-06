import type { ReactNode } from "react";
import { BannerAd } from "./BannerAd";

export function SideAds({ children }: { children: ReactNode }) {
  return (
    <div className="layout-with-sides">
      <aside className="ad-side ad-side--left">
        <BannerAd size="skyscraper" />
      </aside>
      <div className="layout-main">{children}</div>
      <aside className="ad-side ad-side--right">
        <BannerAd size="skyscraper" />
      </aside>
    </div>
  );
}
