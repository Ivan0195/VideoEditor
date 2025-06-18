import React, {useState, useRef, useEffect, FC} from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import styles from './VideoEditor.module.scss'

const ffmpeg = new FFmpeg();

const VideoEditor: FC = () => {

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [volume, setVolume] = useState<number>(0.7);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [trimStart, setTrimStart] = useState<number>(0);
    const [trimEnd, setTrimEnd] = useState<number>(0);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragType, setDragType] = useState<'start' | 'end' | null>(null);
    const [isFFmpegReady, setIsFFmpegReady] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [ffmpegLoaded, setFfmpegLoaded] = useState<boolean>(false);
    const [cropArea, setCropArea] = useState({
        x: 0,
        y: 0,
        width: 0,
        height: 0
    });
    const [isCropping, setIsCropping] = useState<boolean>(false);
    const [cropHandle, setCropHandle] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null>(null);
    const [originalVideoSize, setOriginalVideoSize] = useState({ width: 0, height: 0 });
    const [cropHistory, setCropHistory] = useState<Array<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>>([]);
    const [filters, setFilters] = useState({
        brightness: 0,
        contrast: 1,
        saturation: 1,
        blur: 0,
        sepia: 0,
        grayscale: 0,
        invert: 0,
        hue: 0
    });
    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
    const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const loadFFmpeg = async (): Promise<void> => {
            try {
                if (!ffmpeg.loaded) {
                    await ffmpeg.load({
                        coreURL: '/ffmpeg-core.js',
                        wasmURL: '/ffmpeg-core.wasm'
                    });
                    setFfmpegLoaded(true);
                }
                setIsFFmpegReady(true);
            } catch (error) {
                console.error('Error loading FFmpeg:', error);
            }
        };

        loadFFmpeg();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undoCrop();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [cropHistory]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            setTrimStart(0);
            setTrimEnd(duration);
        }
    };

    const togglePlayPause = (): void => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying( prev => !prev);
    };

    const handleTimeUpdate = (): void => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            drawTimeline();
        }
    };

    const handleLoadedMetadata = (): void => {
        if (videoRef.current) {
            const videoDuration = videoRef.current.duration;
            setDuration(videoDuration);
            setTrimStart(0);
            setTrimEnd(videoDuration);
            generateThumbnails();

            // Set initial crop area
            const video = videoRef.current;
            setOriginalVideoSize({
                width: video.videoWidth,
                height: video.videoHeight
            });
            const initialCrop = {
                x: 0,
                y: 0,
                width: video.videoWidth,
                height: video.videoHeight
            };
            setCropArea(initialCrop);
            setCropHistory([initialCrop]);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            if (newVolume === 0) {
                setIsMuted(true);
            } else if (isMuted) {
                setIsMuted(false);
            }
        }
    };

    const toggleMute = (): void => {
        if (!videoRef.current) return;
        const newMutedState = !isMuted;
        videoRef.current.muted = newMutedState;
        setIsMuted(newMutedState);
    };

    const rewindVideo = (): void => {
        if (!videoRef.current) return;
        const newTime = Math.max(0, videoRef.current.currentTime - 5);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const forwardVideo = (): void => {
        if (!videoRef.current) return;
        const newTime = Math.min(duration, videoRef.current.currentTime + 5);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleTimelineMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!timelineCanvasRef.current || !videoRef.current) return;
        const canvas = timelineCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const timelineWidth = canvas.width;
        const startX = (trimStart / duration) * timelineWidth;
        const endX = (trimEnd / duration) * timelineWidth;
        const handleWidth = 10;
        if (Math.abs(x - startX) < handleWidth) {
            setIsDragging(true);
            setDragType('start');
        } else if (Math.abs(x - endX) < handleWidth) {
            setIsDragging(true);
            setDragType('end');
        } else {
            const clickPercentage = x / timelineWidth;
            const targetTime = clickPercentage * duration;
            const boundedTime = Math.max(0, Math.min(targetTime, duration));
            videoRef.current.currentTime = boundedTime;
            setCurrentTime(boundedTime);
        }
    };

    const handleTimelineMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!isDragging || !timelineCanvasRef.current || !videoRef.current) return;
        const canvas = timelineCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const timelineWidth = canvas.width;
        const clickPercentage = x / timelineWidth;
        const targetTime = clickPercentage * duration;
        const boundedTime = Math.max(0, Math.min(targetTime, duration));
        if (dragType === 'start') {
            setTrimStart(Math.min(boundedTime, trimEnd - 0.1));
        } else if (dragType === 'end') {
            setTrimEnd(Math.max(boundedTime, trimStart + 0.1));
        }
        drawTimeline();
    };

    const handleTimelineMouseUp = (): void => {
        setIsDragging(false);
        setDragType(null);
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
            const time = (index / thumbnailCount) * duration;
            video.currentTime = time;

            return new Promise<void>((resolve) => {
                const handleSeeked = () => {
                    try {
                        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                            index * thumbnailWidth, 0, thumbnailWidth, thumbnailHeight);
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

    const drawTimeline = (): void => {
        if (!timelineCanvasRef.current || !thumbnailCanvasRef.current || duration === 0) return;
        const timelineCanvas = timelineCanvasRef.current;
        const thumbnailCanvas = thumbnailCanvasRef.current;
        const ctx = timelineCanvas.getContext('2d');
        if (!ctx) return;
        const displayWidth = timelineCanvas.clientWidth;
        const displayHeight = timelineCanvas.clientHeight;
        timelineCanvas.width = displayWidth;
        timelineCanvas.height = displayHeight;
        ctx.clearRect(0, 0, timelineCanvas.width, timelineCanvas.height);
        const thumbnailCount = 10;
        const thumbnailWidth = thumbnailCanvas.width / thumbnailCount;
        const timelineWidth = timelineCanvas.width;
        const thumbnailDisplayWidth = timelineWidth / thumbnailCount;
        for (let i = 0; i < thumbnailCount; i++) {
            ctx.drawImage(
                thumbnailCanvas,
                i * thumbnailWidth, 0, thumbnailWidth, thumbnailCanvas.height,
                i * thumbnailDisplayWidth, 0, thumbnailDisplayWidth, timelineCanvas.height
            );
        }
        const startX = (trimStart / duration) * timelineWidth;
        const endX = (trimEnd / duration) * timelineWidth;
        const width = endX - startX;
        ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        ctx.fillRect(startX, 0, width, timelineCanvas.height);
        const handleWidth = 10;
        const handleHeight = timelineCanvas.height;
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(startX - handleWidth/2, 0, handleWidth, handleHeight);
        ctx.fillRect(endX - handleWidth/2, 0, handleWidth, handleHeight);
        const progressX = (currentTime / duration) * timelineWidth;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(progressX, 0);
        ctx.lineTo(progressX, timelineCanvas.height);
        ctx.stroke();
    };

    const downloadTrimmedVideo = async (): Promise<void> => {
        if (!videoFile || trimEnd <= trimStart || !ffmpegLoaded) return;
        setIsProcessing(true);
        try {
            if (!ffmpeg.loaded) {
                throw new Error('FFmpeg not loaded');
            }
            await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
            await ffmpeg.exec([
                '-i', 'input.mp4',
                '-ss', trimStart.toString(),
                '-to', trimEnd.toString(),
                '-c', 'copy',
                'output.mp4'
            ]);
            const data = await ffmpeg.readFile('output.mp4');
            if (!data) {
                throw new Error('No output data');
            }
            const trimmedVideoUrl = URL.createObjectURL(
                new Blob([data], { type: 'video/mp4' })
            );

            const a = document.createElement('a');
            a.href = trimmedVideoUrl;
            a.download = `trimmed-video-${Math.floor(trimStart)}-${Math.floor(trimEnd)}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(trimmedVideoUrl);
        } catch (error) {
            console.error('Error trimming video:', error);
            alert('Error processing video. See console for details.');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (time: number): string => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const detectCropHandle = (x: number, y: number): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null => {
        if (!cropCanvasRef.current) return null;
        
        const canvas = cropCanvasRef.current;
        const scaleX = canvas.width / originalVideoSize.width;
        const scaleY = canvas.height / originalVideoSize.height;
        
        const handleX = cropArea.x * scaleX;
        const handleY = cropArea.y * scaleY;
        const handleWidth = cropArea.width * scaleX;
        const handleHeight = cropArea.height * scaleY;
        const handleSize = 12;
        const handleRadius = handleSize / 2;

        // Check each handle
        if (Math.abs(x - handleX) <= handleRadius && Math.abs(y - handleY) <= handleRadius) {
            return 'top-left';
        }
        if (Math.abs(x - (handleX + handleWidth)) <= handleRadius && Math.abs(y - handleY) <= handleRadius) {
            return 'top-right';
        }
        if (Math.abs(x - handleX) <= handleRadius && Math.abs(y - (handleY + handleHeight)) <= handleRadius) {
            return 'bottom-left';
        }
        if (Math.abs(x - (handleX + handleWidth)) <= handleRadius && Math.abs(y - (handleY + handleHeight)) <= handleRadius) {
            return 'bottom-right';
        }

        return null;
    };

    const handleCropStart = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!cropCanvasRef.current) return;
        
        const canvas = cropCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const handle = detectCropHandle(x, y);
        if (handle) {
            e.preventDefault();
            setIsCropping(true);
            setCropHandle(handle);
            // Save current crop state to history before starting new crop
            setCropHistory(prev => [...prev, cropArea]);
        }
    };

    const handleCropMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!isCropping || !cropHandle || !cropCanvasRef.current || !videoRef.current) return;

        const canvas = cropCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = originalVideoSize.width / canvas.width;
        const scaleY = originalVideoSize.height / canvas.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        let newCropArea = { ...cropArea };

        switch (cropHandle) {
            case 'top-left':
                newCropArea.x = Math.max(0, Math.min(mouseX, cropArea.x + cropArea.width - 100));
                newCropArea.y = Math.max(0, Math.min(mouseY, cropArea.y + cropArea.height - 100));
                newCropArea.width = cropArea.x + cropArea.width - newCropArea.x;
                newCropArea.height = cropArea.y + cropArea.height - newCropArea.y;
                break;
            case 'top-right':
                newCropArea.y = Math.max(0, Math.min(mouseY, cropArea.y + cropArea.height - 100));
                newCropArea.width = Math.max(100, Math.min(mouseX - cropArea.x, originalVideoSize.width - cropArea.x));
                newCropArea.height = cropArea.y + cropArea.height - newCropArea.y;
                break;
            case 'bottom-left':
                newCropArea.x = Math.max(0, Math.min(mouseX, cropArea.x + cropArea.width - 100));
                newCropArea.width = cropArea.x + cropArea.width - newCropArea.x;
                newCropArea.height = Math.max(100, Math.min(mouseY - cropArea.y, originalVideoSize.height - cropArea.y));
                break;
            case 'bottom-right':
                newCropArea.width = Math.max(100, Math.min(mouseX - cropArea.x, originalVideoSize.width - cropArea.x));
                newCropArea.height = Math.max(100, Math.min(mouseY - cropArea.y, originalVideoSize.height - cropArea.y));
                break;
        }

        setCropArea(newCropArea);
        drawCropArea();
    };

    const handleCropEnd = (): void => {
        setIsCropping(false);
        setCropHandle(null);
    };

    const downloadCroppedVideo = async (): Promise<void> => {
        if (!videoFile || !ffmpegLoaded) return;
        setIsProcessing(true);
        try {
            if (!ffmpeg.loaded) {
                throw new Error('FFmpeg not loaded');
            }
            await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
            await ffmpeg.exec([
                '-i', 'input.mp4',
                '-vf', `crop=${cropArea.width}:${cropArea.height}:${cropArea.x}:${cropArea.y}`,
                '-c:a', 'copy',
                'output.mp4'
            ]);
            const data = await ffmpeg.readFile('output.mp4');
            if (!data) {
                throw new Error('No output data');
            }
            const croppedVideoUrl = URL.createObjectURL(
                new Blob([data], { type: 'video/mp4' })
            );

            const a = document.createElement('a');
            a.href = croppedVideoUrl;
            a.download = `cropped-video-${Math.floor(cropArea.width)}x${Math.floor(cropArea.height)}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(croppedVideoUrl);
        } catch (error) {
            console.error('Error cropping video:', error);
            alert('Error processing video. See console for details.');
        } finally {
            setIsProcessing(false);
        }
    };

    const undoCrop = (): void => {
        if (cropHistory.length > 0) {
            const previousCrop = cropHistory[cropHistory.length - 1];
            setCropArea(previousCrop);
            setCropHistory(prev => prev.slice(0, -1));
        }
    };

    const handleFilterChange = (filterName: string, value: number): void => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));

        if (value !== 0 && value !== 1) {
            if (!activeFilters.includes(filterName)) {
                setActiveFilters(prev => [...prev, filterName]);
            }
        } else {
            setActiveFilters(prev => prev.filter(f => f !== filterName));
        }
    };

    const getCssFilterStyle = (): React.CSSProperties => {
        const cssFilters: string[] = [];

        if (filters.brightness !== 0) {
            cssFilters.push(`brightness(${1 + filters.brightness})`);
        }
        if (filters.contrast !== 1) {
            cssFilters.push(`contrast(${filters.contrast})`);
        }
        if (filters.saturation !== 1) {
            cssFilters.push(`saturate(${filters.saturation})`);
        }
        if (filters.blur > 0) {
            cssFilters.push(`blur(${filters.blur}px)`);
        }
        if (filters.sepia > 0) {
            cssFilters.push(`sepia(${filters.sepia})`);
        }
        if (filters.grayscale > 0) {
            cssFilters.push(`grayscale(${filters.grayscale})`);
        }
        if (filters.invert > 0) {
            cssFilters.push(`invert(${filters.invert})`);
        }
        if (filters.hue !== 0) {
            cssFilters.push(`hue-rotate(${filters.hue}deg)`);
        }

        return {
            filter: cssFilters.join(' ')
        };
    };

    const downloadFilteredVideo = async (): Promise<void> => {
        if (!videoRef.current || !ffmpeg) return;

        try {
            setIsProcessing(true);
            const videoData = await fetch(videoUrl).then(r => r.arrayBuffer());
            await ffmpeg.writeFile('input.mp4', new Uint8Array(videoData));

            const filterParts: string[] = [];
            if (filters.brightness !== 0) {
                filterParts.push(`eq=brightness=${filters.brightness}`);
            }
            if (filters.contrast !== 1) {
                filterParts.push(`eq=contrast=${filters.contrast}`);
            }
            if (filters.saturation !== 1) {
                filterParts.push(`eq=saturation=${filters.saturation}`);
            }
            if (filters.blur > 0) {
                filterParts.push(`boxblur=${filters.blur}`);
            }
            if (filters.sepia > 0) {
                filterParts.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`);
            }
            if (filters.grayscale > 0) {
                filterParts.push('hue=s=0');
            }
            if (filters.invert > 0) {
                filterParts.push('negate');
            }
            if (filters.hue !== 0) {
                filterParts.push(`hue=h=${filters.hue}`);
            }

            const filterString = filterParts.join(',');

            await ffmpeg.exec([
                '-i', 'input.mp4',
                '-vf', filterString,
                '-c:a', 'copy',
                'output.mp4'
            ]);

            const data = await ffmpeg.readFile('output.mp4');
            const url = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'filtered_video.mp4';
            a.click();
            URL.revokeObjectURL(url);
            await ffmpeg.deleteFile('input.mp4');
            await ffmpeg.deleteFile('output.mp4');
        } catch (error) {
            console.error('Error processing video:', error);
            alert('Error processing video. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const resetFilters = (): void => {
        setFilters({
            brightness: 0,
            contrast: 1,
            saturation: 1,
            blur: 0,
            sepia: 0,
            grayscale: 0,
            invert: 0,
            hue: 0
        });
        setActiveFilters([]);
    };

    useEffect(() => {
        drawCropArea();
    }, [cropArea, originalVideoSize]);

    const drawCropArea = (): void => {
        if (!cropCanvasRef.current || !videoContainerRef.current) return;
        
        const canvas = cropCanvasRef.current;
        const container = videoContainerRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match container
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate crop area position and size
        const scaleX = canvas.width / originalVideoSize.width;
        const scaleY = canvas.height / originalVideoSize.height;
        
        const x = cropArea.x * scaleX;
        const y = cropArea.y * scaleY;
        const width = cropArea.width * scaleX;
        const height = cropArea.height * scaleY;

        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear crop area
        ctx.clearRect(x, y, width, height);

        // Draw crop area border
        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw crop handles
        const handleSize = 12;
        const handleRadius = handleSize / 2;
        
        // Draw handles
        const handles = [
            { x: x - handleRadius, y: y - handleRadius }, // top-left
            { x: x + width - handleRadius, y: y - handleRadius }, // top-right
            { x: x - handleRadius, y: y + height - handleRadius }, // bottom-left
            { x: x + width - handleRadius, y: y + height - handleRadius } // bottom-right
        ];

        handles.forEach(handle => {
            ctx.beginPath();
            ctx.arc(handle.x + handleRadius, handle.y + handleRadius, handleRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#4a90e2';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.fileInputContainer}>
                <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                />
            </div>

            {videoUrl && (
                <div className={styles.playerContainer}>
                    <div 
                        ref={videoContainerRef}
                        className={styles.videoContainer}
                    >
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className={styles.video}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={() => setIsPlaying(false)}
                            onLoadedData={() => {
                                if (videoRef.current && duration > 0) {
                                    generateThumbnails();
                                }
                            }}
                            controls={false}
                            style={getCssFilterStyle()}
                        />
                        <canvas
                            ref={cropCanvasRef}
                            className={styles.cropCanvas}
                            onMouseDown={handleCropStart}
                            onMouseMove={handleCropMove}
                            onMouseUp={handleCropEnd}
                            onMouseLeave={handleCropEnd}
                        />
                        <canvas ref={thumbnailCanvasRef} style={{ display: 'none' }} />
                    </div>

                    <div className={styles.controls}>
                        <button
                            onClick={togglePlayPause}
                            className={styles.controlButton}
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                        <button
                            onClick={rewindVideo}
                            className={styles.controlButton}
                        >
                            -5s
                        </button>
                        <button
                            onClick={forwardVideo}
                            className={styles.controlButton}
                        >
                            +5s
                        </button>
                        <button
                            onClick={toggleMute}
                            className={styles.controlButton}
                        >
                            {isMuted ? 'Unmute' : 'Mute'}
                        </button>
                        <div className={styles.volumeContainer}>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={handleVolumeChange}
                                className={styles.volume}
                            />
                        </div>
                        <span className={styles.timeDisplay}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className={styles.timelineSection}>
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

                        <div className={styles.trimInfo}>
                            <span>Trim: {formatTime(trimStart)} - {formatTime(trimEnd)}</span>
                        </div>

                        <div className={styles.actionButtons}>
                            <button
                                onClick={downloadTrimmedVideo}
                                disabled={trimEnd <= trimStart || !ffmpegLoaded || isProcessing}
                                className={`${styles.actionButton} ${trimEnd <= trimStart || !ffmpegLoaded || isProcessing ? styles.disabledButton : ''}`}
                            >
                                {isProcessing ? 'Processing...' : 'Download Trimmed Video'}
                            </button>
                            <button
                                onClick={downloadCroppedVideo}
                                disabled={!ffmpegLoaded || isProcessing}
                                className={`${styles.actionButton} ${!ffmpegLoaded || isProcessing ? styles.disabledButton : ''}`}
                            >
                                {isProcessing ? 'Processing...' : 'Download Cropped Video'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.filtersSection}>
                        <h3>Video Filters</h3>
                        <div className={styles.filtersGrid}>
                            <div className={styles.filterControl}>
                                <label>Brightness</label>
                                <input
                                    type="range"
                                    min="-1"
                                    max="1"
                                    step="0.1"
                                    value={filters.brightness}
                                    onChange={(e) => handleFilterChange('brightness', parseFloat(e.target.value))}
                                />
                                <span>{filters.brightness}</span>
                            </div>
                            <div className={styles.filterControl}>
                                <label>Contrast</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={filters.contrast}
                                    onChange={(e) => handleFilterChange('contrast', parseFloat(e.target.value))}
                                />
                                <span>{filters.contrast}</span>
                            </div>
                            <div className={styles.filterControl}>
                                <label>Saturation</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={filters.saturation}
                                    onChange={(e) => handleFilterChange('saturation', parseFloat(e.target.value))}
                                />
                                <span>{filters.saturation}</span>
                            </div>
                            <div className={styles.filterControl}>
                                <label>Blur</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    value={filters.blur}
                                    onChange={(e) => handleFilterChange('blur', parseFloat(e.target.value))}
                                />
                                <span>{filters.blur}</span>
                            </div>
                            <div className={styles.filterControl}>
                                <label>Sepia</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={filters.sepia}
                                    onChange={(e) => handleFilterChange('sepia', parseFloat(e.target.value))}
                                />
                                <span>{filters.sepia}</span>
                            </div>
                            <div className={styles.filterControl}>
                                <label>Grayscale</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={filters.grayscale}
                                    onChange={(e) => handleFilterChange('grayscale', parseFloat(e.target.value))}
                                />
                                <span>{filters.grayscale}</span>
                            </div>
                            <div className={styles.filterControl}>
                                <label>Invert</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={filters.invert}
                                    onChange={(e) => handleFilterChange('invert', parseFloat(e.target.value))}
                                />
                                <span>{filters.invert}</span>
                            </div>
                            <div className={styles.filterControl}>
                                <label>Hue</label>
                                <input
                                    type="range"
                                    min="-180"
                                    max="180"
                                    step="1"
                                    value={filters.hue}
                                    onChange={(e) => handleFilterChange('hue', parseFloat(e.target.value))}
                                />
                                <span>{filters.hue}</span>
                            </div>
                        </div>
                        <div className={styles.filterActions}>
                            <button
                                onClick={resetFilters}
                                className={styles.actionButton}
                            >
                                Reset Filters
                            </button>
                            <button
                                onClick={downloadFilteredVideo}
                                disabled={!ffmpegLoaded || isProcessing || activeFilters.length === 0}
                                className={`${styles.actionButton} ${(!ffmpegLoaded || isProcessing || activeFilters.length === 0) ? styles.disabledButton : ''}`}
                            >
                                {isProcessing ? 'Processing...' : 'Download Filtered Video'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoEditor;
