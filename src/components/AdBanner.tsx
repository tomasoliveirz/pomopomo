'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
	// Optional unique key to differentiate multiple ad slots on same page
	adSlot?: string;
	// Inline styles width/height per Google requirements
	style?: React.CSSProperties;
}

declare global {
	interface Window {
		adsbygoogle: any[];
	}
}

// Track if script has been loaded globally
let scriptLoaded = false;

export default function AdBanner({ adSlot = '9874187873', style }: AdBannerProps) {
	const insRef = useRef<HTMLElement | null>(null);
	const pushedRef = useRef(false);

	useEffect(() => {
		const pushAd = () => {
			if (pushedRef.current) return;

			if (typeof window !== 'undefined' && insRef.current) {
				try {
					// Initialize adsbygoogle array if it doesn't exist
					if (!window.adsbygoogle) {
						window.adsbygoogle = [];
					}

					// Push the ad
					window.adsbygoogle.push({});
					pushedRef.current = true;
				} catch (e) {
					console.error('AdSense push error:', e);
				}
			}
		};

		// Check if script already exists in head (from layout.tsx or elsewhere)
		const checkForExistingScript = () => {
			const scripts = document.head.getElementsByTagName('script');
			for (let i = 0; i < scripts.length; i++) {
				if (scripts[i].src && scripts[i].src.includes('adsbygoogle.js')) {
					return true;
				}
			}
			return false;
		};

		if (typeof window !== 'undefined') {
			// Initialize adsbygoogle array immediately
			if (!window.adsbygoogle) {
				window.adsbygoogle = [];
			}

			// Check if script already exists (from layout.tsx)
			const scriptExists = checkForExistingScript();

			if (scriptExists) {
				// Script is already in head, wait a bit for it to load then push
				// The script from layout.tsx is async, so we need to wait
				const tryPush = () => {
					if (insRef.current) {
						pushAd();
					}
				};

				// Try immediately (script might already be loaded)
				tryPush();

				// Also try after delays to ensure script has loaded
				const timeouts = [
					setTimeout(tryPush, 500),
					setTimeout(tryPush, 1000),
					setTimeout(tryPush, 2000),
				];

				return () => {
					timeouts.forEach(clearTimeout);
				};
			} else if (!scriptLoaded) {
				// Script doesn't exist, load it
				const existingScript = document.getElementById('adsbygoogle-js');
				if (existingScript) {
					scriptLoaded = true;
					setTimeout(pushAd, 500);
				} else {
					const script = document.createElement('script');
					script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1657008186985321';
					script.async = true;
					script.crossOrigin = 'anonymous';
					script.id = 'adsbygoogle-js';

					script.onload = () => {
						scriptLoaded = true;
						pushAd();
					};

					document.head.appendChild(script);
				}

				// Fallback: try pushing after delay
				const timeout = setTimeout(pushAd, 2000);
				return () => {
					clearTimeout(timeout);
				};
			} else {
				// Script already loaded
				pushAd();
			}
		}
	}, []);

	return (
		<div className="flex w-full items-center justify-center min-h-0">
			<ins
				ref={insRef as any}
				className="adsbygoogle my-4"
				style={style || { display: 'inline-block', width: 728, height: 90 }}
				data-ad-client="ca-pub-1657008186985321"
				data-ad-slot={adSlot}
			/>
		</div>
	);
}


