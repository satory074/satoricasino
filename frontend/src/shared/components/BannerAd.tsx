import { useEffect, useRef } from "react";
import { getAdBridge } from "../ad";

type BannerSize = "standard" | "mrec" | "leaderboard" | "skyscraper";

interface BannerAdProps {
  size?: BannerSize;
  className?: string;
}

export function BannerAd({ size = "standard", className }: BannerAdProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bridge = getAdBridge();
    if (ref.current) {
      bridge.showBanner(ref.current, size);
    }
    return () => {
      bridge.destroyBanner();
    };
  }, [size]);

  return (
    <div
      className={`ad-banner-slot ad-banner-slot--${size}${className ? ` ${className}` : ""}`}
      ref={ref}
    />
  );
}
