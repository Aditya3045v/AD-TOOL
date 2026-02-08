import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsBackgroundVideoProps {
    url: string;
}

const HlsBackgroundVideo: React.FC<HlsBackgroundVideoProps> = ({ url }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Use Intersection Observer to play/pause video based on visibility
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        observer.observe(video);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isVisible) {
            if (!hlsRef.current) {
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        enableWorker: true,
                        lowLatencyMode: true,
                        maxBufferLength: 30,
                        maxMaxBufferLength: 60,
                    });
                    hls.loadSource(url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        video.play().catch(() => { });
                    });
                    hlsRef.current = hls;
                } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                    video.src = url;
                    video.addEventListener("loadedmetadata", () => {
                        video.play().catch(() => { });
                    });
                }
            } else {
                video.play().catch(() => { });
            }
        } else {
            video.pause();
        }
    }, [isVisible, url]);

    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, []);

    return (
        <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            muted
            loop
            playsInline
            style={{ willChange: 'transform' }}
        />
    );
};

export default HlsBackgroundVideo;
