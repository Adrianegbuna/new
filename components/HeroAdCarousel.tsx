import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/apiConfig';

type RemoteAdBanner = {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  linkUrl?: string | null;
  redirectUrl?: string | null;
  type?: 'flash_deal' | 'product' | 'swap_resale' | null;
  ctaText?: string | null;
  durationSeconds?: number | null;
};

type Slide =
  | { kind: 'pay-small-small' }
  | { kind: 'ad'; ad: RemoteAdBanner };

const DEFAULT_IMAGE_SECONDS = 7;
const MAX_VIDEO_SECONDS = 20;

const resolveAdHref = (ad: RemoteAdBanner): string | null => {
  if (ad.redirectUrl) return ad.redirectUrl;
  if (ad.type === 'flash_deal') return '/flash-deals';
  if (ad.type === 'swap_resale') return '/swap-resale';
  if (ad.type === 'product') return '/products';
  return ad.linkUrl || null;
};

export default function HeroAdCarousel() {
  const [ads, setAds] = useState<RemoteAdBanner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchAds = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/ad-banners/active`);
        if (!response.ok) return;
        const data = await response.json();
        if (!Array.isArray(data)) return;
        if (isMounted) setAds(data);
      } catch (error) {
        console.error('[HERO ADS] Failed to fetch ad banners:', error);
      }
    };

    fetchAds();
    return () => {
      isMounted = false;
    };
  }, []);

  const slides: Slide[] = useMemo(() => {
    return [...ads.map((ad) => ({ kind: 'ad' as const, ad }))];
  }, [ads]);

  useEffect(() => {
    if (slides.length === 0) return;
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const current = slides[activeIndex];
    let durationSeconds = DEFAULT_IMAGE_SECONDS;

    if (current.kind === 'ad') {
      if (current.ad.mediaType === 'video') {
        durationSeconds = current.ad.durationSeconds ?? MAX_VIDEO_SECONDS;
      } else {
        durationSeconds = current.ad.durationSeconds ?? DEFAULT_IMAGE_SECONDS;
      }
    }

    const timer = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, durationSeconds * 1000);

    return () => clearTimeout(timer);
  }, [activeIndex, slides]);

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };
  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (slides.length === 0) {
    return null;
  }

  const activeSlide = slides[activeIndex];
  const adHref = activeSlide.kind === 'ad' ? resolveAdHref(activeSlide.ad) : null;
  const adContent = activeSlide.kind === 'ad' ? (
    <>
      {activeSlide.ad.mediaType === 'image' ? (
        <img
          src={activeSlide.ad.mediaUrl}
          alt={activeSlide.ad.title}
          className="w-full h-[260px] sm:h-[300px] md:h-[340px] object-cover"
        />
      ) : (
        <video
          src={activeSlide.ad.mediaUrl}
          className="w-full h-[260px] sm:h-[300px] md:h-[340px] object-cover"
          muted
          playsInline
          autoPlay
          preload="auto"
          onEnded={goNext}
        />
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous advert"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 text-gray-800 shadow-md opacity-0 group-hover:opacity-100 transition"
          >
            &lt;
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next advert"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 text-gray-800 shadow-md opacity-0 group-hover:opacity-100 transition"
          >
            &gt;
          </button>
        </>
      )}

      {(activeSlide.ad.linkUrl || activeSlide.ad.title) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent flex items-end justify-between p-4">
          <div className="text-white font-semibold text-sm sm:text-base">{activeSlide.ad.title}</div>
        </div>
      )}
    </>
  ) : null;

  return (
    <div className="relative">
      {activeSlide.kind === 'ad' && (
        adHref ? (
          <Link
            href={adHref}
            className="relative rounded-2xl shadow-2xl overflow-hidden mb-3 sm:mb-4 bg-gray-100 min-h-[260px] sm:min-h-[300px] md:min-h-[340px] group block cursor-pointer"
          >
            {adContent}
          </Link>
        ) : (
          <div className="relative rounded-2xl shadow-2xl overflow-hidden mb-3 sm:mb-4 bg-gray-100 min-h-[260px] sm:min-h-[300px] md:min-h-[340px] group">
            {adContent}
          </div>
        )
      )}

      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 mb-4">
          {slides.map((_, idx) => (
            <button
              key={`hero-dot-${idx}`}
              onClick={() => setActiveIndex(idx)}
              className={`h-2.5 w-2.5 rounded-full transition ${idx === activeIndex ? 'bg-emerald-600' : 'bg-emerald-200'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
