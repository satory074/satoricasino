import { useEffect, useRef } from "react";
import { getAdBridge } from "../ad";

export function BannerAd() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bridge = getAdBridge();
    if (ref.current) {
      bridge.showBanner(ref.current);
    }
    return () => {
      bridge.destroyBanner();
    };
  }, []);

  return <div className="ad-banner-slot" ref={ref} />;
}
