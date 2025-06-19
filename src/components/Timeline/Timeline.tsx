import React, { useRef, useEffect } from 'react';
import styles from './Timeline.module.scss';

interface TimelineProps {
    videoUrl: string;
    isMetadataLoaded: boolean;
    videoRef: React.RefObject<HTMLVideoElement>;
    thumbnailCanvasRef: React.RefObject<HTMLCanvasElement>;
    duration: number;
    currentTime: number;
    trimStart: number;
    trimEnd: number;
    setTrimStart: (value: number) => void;
    setTrimEnd: (value: number) => void;
    setCurrentTime: (value: number) => void;
    formatTime: (time: number) => string;
    isProcessing: boolean;
    ffmpegLoaded: boolean;
    downloadTrimmedVideo: () => Promise<void>;
    downloadCroppedVideo: () => Promise<void>;
}

const Timeline: React.FC<TimelineProps> = ({
    videoUrl,
    isMetadataLoaded,
    videoRef,
    thumbnailCanvasRef,
    duration,
    currentTime,
    trimStart,
    trimEnd,
    setTrimStart,
    setTrimEnd,
    setCurrentTime,
    formatTime,
    isProcessing,
    ffmpegLoaded,
    downloadTrimmedVideo,
    downloadCroppedVideo,
}) => {
    const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDragging = useRef(false);
    const dragType = useRef<'start' | 'end' | null>(null);

    useEffect(() => {
        drawTimeline()
    }, [currentTime])

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            drawTimeline();
        });

        if (timelineCanvasRef.current?.parentElement) {
            resizeObserver.observe(timelineCanvasRef.current.parentElement);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const drawTimeline = () => {
        if (!timelineCanvasRef.current || !thumbnailCanvasRef.current || duration === 0) return;
        const timelineCanvas = timelineCanvasRef.current;
        const thumbnailCanvas = thumbnailCanvasRef.current;
        const ctx = timelineCanvas.getContext('2d');
        if (!ctx) return;
        const container = timelineCanvas.parentElement;
        if (!container) return;
        const displayWidth = container.clientWidth;
        const displayHeight = container.clientHeight;
        timelineCanvas.width = displayWidth;
        timelineCanvas.height = displayHeight;
        ctx.clearRect(0, 0, timelineCanvas.width, timelineCanvas.height);
        const thumbnailCount = 10;
        const thumbnailWidth = thumbnailCanvas.width / thumbnailCount;
        const thumbnailDisplayWidth = timelineCanvas.width / thumbnailCount;

        for (let i = 0; i < thumbnailCount; i++) {
            ctx.drawImage(
                thumbnailCanvas,
                i * thumbnailWidth, 0, thumbnailWidth, thumbnailCanvas.height,
                i * thumbnailDisplayWidth, 0, thumbnailDisplayWidth, timelineCanvas.height
            );
        }

        const startX = (trimStart / duration) * timelineCanvas.width;
        const endX = (trimEnd / duration) * timelineCanvas.width;
        const width = endX - startX;

        ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        ctx.fillRect(startX, 0, width, timelineCanvas.height);
        const handleWidth = 10;
        const handleHeight = timelineCanvas.height;
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(startX - handleWidth/2, 0, handleWidth, handleHeight);
        ctx.fillRect(endX - handleWidth/2, 0, handleWidth, handleHeight);
        const progressX = (currentTime / duration) * timelineCanvas.width;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(progressX, 0);
        ctx.lineTo(progressX, timelineCanvas.height);
        ctx.stroke();
    };

    const generateThumbnails = (): void => {
        if (!videoRef.current || !thumbnailCanvasRef.current || duration === 0) return;
        const video = videoRef.current;
        const canvas = thumbnailCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const thumbnailCount = 10;
        const thumbnailWidth = 160;
        const thumbnailHeight = 90;
        canvas.width = thumbnailCount * thumbnailWidth;
        canvas.height = thumbnailHeight;

        const generateThumbnail = async (index: number) => {
            video.currentTime = (index / thumbnailCount) * duration;

            return new Promise<void>((resolve) => {
                const handleSeeked = () => {
                    try {
                        const aspectRatio = video.videoWidth / video.videoHeight;
                        let drawWidth = thumbnailWidth;
                        let drawHeight = thumbnailHeight;
                        let offsetX = 0;
                        let offsetY = 0;

                        if (aspectRatio > 16/9) {
                            drawHeight = thumbnailWidth / aspectRatio;
                            offsetY = (thumbnailHeight - drawHeight) / 2;
                        } else {
                            drawWidth = thumbnailHeight * aspectRatio;
                            offsetX = (thumbnailWidth - drawWidth) / 2;
                        }

                        ctx.drawImage(
                            video,
                            0, 0, video.videoWidth, video.videoHeight,
                            index * thumbnailWidth + offsetX, offsetY, drawWidth, drawHeight
                        );
                        video.removeEventListener('seeked', handleSeeked);
                        resolve();
                    } catch (error) {
                        console.error('Error generating thumbnail:', error);
                        resolve();
                    }
                };
                video.addEventListener('seeked', handleSeeked);
            });
        };

        const generateAllThumbnails = async () => {
            for (let i = 0; i < thumbnailCount; i++) {
                await generateThumbnail(i);
            }
            drawTimeline();
        };

        generateAllThumbnails();
    };

    useEffect(() => {
        if (isMetadataLoaded) {
            generateThumbnails()
        }
    }, [isMetadataLoaded, videoUrl])

    useEffect(() => {
        drawTimeline();
        const resizeObserver = new ResizeObserver(() => {
            drawTimeline();
        });
        if (timelineCanvasRef.current?.parentElement) {
            resizeObserver.observe(timelineCanvasRef.current.parentElement);
        }
        return () => {
            resizeObserver.disconnect();
        };
    }, [duration, currentTime, trimStart, trimEnd, thumbnailCanvasRef]);

    const handleTimelineMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!timelineCanvasRef.current || !videoRef.current) return;
        const canvas = timelineCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const timelineWidth = canvas.width;
        const startX = (trimStart / duration) * timelineWidth;
        const endX = (trimEnd / duration) * timelineWidth;
        const handleWidth = 10;
        if (Math.abs(x - startX) < handleWidth) {
            isDragging.current = true;
            dragType.current = 'start';
        } else if (Math.abs(x - endX) < handleWidth) {
            isDragging.current = true;
            dragType.current = 'end';
        } else {
            const clickPercentage = x / timelineWidth;
            const targetTime = clickPercentage * duration;
            const boundedTime = Math.max(0, Math.min(targetTime, duration));
            if (videoRef.current) {
                videoRef.current.currentTime = boundedTime;
            }
            setCurrentTime(boundedTime);
        }
    };

    const handleTimelineMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging.current || !timelineCanvasRef.current || !videoRef.current) return;
        const canvas = timelineCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const timelineWidth = canvas.width;
        const clickPercentage = x / timelineWidth;
        const targetTime = clickPercentage * duration;
        const boundedTime = Math.max(0, Math.min(targetTime, duration));
        if (dragType.current === 'start') {
            setTrimStart(Math.min(boundedTime, trimEnd - 0.1));
        } else if (dragType.current === 'end') {
            setTrimEnd(Math.max(boundedTime, trimStart + 0.1));
        }
    };

    const handleTimelineMouseUp = () => {
        isDragging.current = false;
        dragType.current = null;
    };

    return (
        <section className={styles.timelineSection} aria-label="Timeline">
            <div className={styles.timelineContainer}>
                <canvas
                    ref={timelineCanvasRef}
                    className={styles.timeline}
                    width={800}
                    height={80}
                    onMouseDown={handleTimelineMouseDown}
                    onMouseMove={handleTimelineMouseMove}
                    onMouseUp={handleTimelineMouseUp}
                    onMouseLeave={handleTimelineMouseUp}
                />
            </div>
            <output className={styles.trimInfo} aria-live="polite">
                <span>Trim: {formatTime(trimStart)} - {formatTime(trimEnd)}</span>
            </output>
            <nav className={styles.actionButtons} aria-label="Timeline actions">
                <button
                    onClick={downloadTrimmedVideo}
                    disabled={trimEnd <= trimStart || !ffmpegLoaded || isProcessing}
                    className={`${styles.actionButton}${trimEnd <= trimStart || !ffmpegLoaded || isProcessing ? ' ' + styles.disabledButton : ''}`}
                >
                    {isProcessing ? 'Processing...' : 'Download Trimmed Video'}
                </button>
                <button
                    onClick={downloadCroppedVideo}
                    disabled={!ffmpegLoaded || isProcessing}
                    className={`${styles.actionButton}${(!ffmpegLoaded || isProcessing) ? ' ' + styles.disabledButton : ''}`}
                >
                    {isProcessing ? 'Processing...' : 'Download Cropped Video'}
                </button>
            </nav>
        </section>
    );
};

export default Timeline;
