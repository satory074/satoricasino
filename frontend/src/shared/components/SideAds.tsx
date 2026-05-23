import type { ReactNode } from "react";
import { BannerAd } from "./BannerAd";

interface Props {
  children: ReactNode;
  ready: boolean;
}

export function SideAds({ children, ready }: Props) {
  return (
    <div className="layout-with-sides">
      <aside className="ad-side ad-side--left">{ready && <BannerAd size="skyscraper" />}</aside>
      <div className="layout-main">{children}</div>
      <aside className="ad-side ad-side--right">{ready && <BannerAd size="skyscraper" />}</aside>
    </div>
  );
}
