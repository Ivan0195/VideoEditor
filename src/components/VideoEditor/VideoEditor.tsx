import React, { useState, useRef, useEffect, FC } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import styles from './VideoEditor.module.scss';
import VideoFilters from '../VideoFilters/VideoFilters';
import Timeline from '../Timeline/Timeline';
import { Filters } from '@/types/types';
import { getCssFilterStyle } from '@/utils/helpers';
import VideoControls from '@/components/VideoControls/VideoControls';

const ffmpeg = new FFmpeg();

const VideoEditor: FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState<boolean>(false);
  const [cropArea, setCropArea] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropHandle, setCropHandle] = useState<
    'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null
  >(null);
  const [originalVideoSize, setOriginalVideoSize] = useState({ width: 0, height: 0 });
  const [cropHistory, setCropHistory] = useState<
    Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  >([]);
  const [filters, setFilters] = useState<Filters>({
    brightness: 0,
    contrast: 1,
    saturation: 1,
    blur: 0,
    sepia: 0,
    grayscale: 0,
    invert: 0,
    hue: 0,
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadFFmpeg = async (): Promise<void> => {
      try {
        if (!ffmpeg.loaded) {
          await ffmpeg.load({
            coreURL: '/ffmpeg-core.js',
            wasmURL: '/ffmpeg-core.wasm',
          });
          setFfmpegLoaded(true);
        }
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
      setCurrentTime(0);
    }
  };

  const togglePlayPause = (): void => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying((prev) => !prev);
  };

  const handleTimeUpdate = (): void => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = (): void => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setTrimStart(0);
      setTrimEnd(videoDuration);
      const video = videoRef.current;
      setOriginalVideoSize({
        width: video.videoWidth,
        height: video.videoHeight,
      });
      const initialCrop = {
        x: 0,
        y: 0,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      setCropArea(initialCrop);
      setCropHistory([initialCrop]);
      setIsMetadataLoaded(true);
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

  const downloadTrimmedVideo = async (): Promise<void> => {
    if (!videoFile || trimEnd <= trimStart || !ffmpegLoaded) return;
    setIsProcessing(true);
    try {
      if (!ffmpeg.loaded) {
        throw new Error('FFmpeg not loaded');
      }
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      await ffmpeg.exec([
        '-i',
        'input.mp4',
        '-ss',
        trimStart.toString(),
        '-to',
        trimEnd.toString(),
        '-c',
        'copy',
        'output.mp4',
      ]);
      const data = await ffmpeg.readFile('output.mp4');
      if (!data) {
        throw new Error('No output data');
      }
      const trimmedVideoUrl = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));

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

  const detectCropHandle = (
    x: number,
    y: number,
  ): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null => {
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

    if (Math.abs(x - handleX) <= handleRadius && Math.abs(y - handleY) <= handleRadius) {
      return 'top-left';
    }
    if (
      Math.abs(x - (handleX + handleWidth)) <= handleRadius &&
      Math.abs(y - handleY) <= handleRadius
    ) {
      return 'top-right';
    }
    if (
      Math.abs(x - handleX) <= handleRadius &&
      Math.abs(y - (handleY + handleHeight)) <= handleRadius
    ) {
      return 'bottom-left';
    }
    if (
      Math.abs(x - (handleX + handleWidth)) <= handleRadius &&
      Math.abs(y - (handleY + handleHeight)) <= handleRadius
    ) {
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
      setCropHistory((prev) => [...prev, cropArea]);
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

    const newCropArea = { ...cropArea };

    switch (cropHandle) {
      case 'top-left':
        newCropArea.x = Math.max(0, Math.min(mouseX, cropArea.x + cropArea.width - 100));
        newCropArea.y = Math.max(0, Math.min(mouseY, cropArea.y + cropArea.height - 100));
        newCropArea.width = cropArea.x + cropArea.width - newCropArea.x;
        newCropArea.height = cropArea.y + cropArea.height - newCropArea.y;
        break;
      case 'top-right':
        newCropArea.y = Math.max(0, Math.min(mouseY, cropArea.y + cropArea.height - 100));
        newCropArea.width = Math.max(
          100,
          Math.min(mouseX - cropArea.x, originalVideoSize.width - cropArea.x),
        );
        newCropArea.height = cropArea.y + cropArea.height - newCropArea.y;
        break;
      case 'bottom-left':
        newCropArea.x = Math.max(0, Math.min(mouseX, cropArea.x + cropArea.width - 100));
        newCropArea.width = cropArea.x + cropArea.width - newCropArea.x;
        newCropArea.height = Math.max(
          100,
          Math.min(mouseY - cropArea.y, originalVideoSize.height - cropArea.y),
        );
        break;
      case 'bottom-right':
        newCropArea.width = Math.max(
          100,
          Math.min(mouseX - cropArea.x, originalVideoSize.width - cropArea.x),
        );
        newCropArea.height = Math.max(
          100,
          Math.min(mouseY - cropArea.y, originalVideoSize.height - cropArea.y),
        );
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
        '-i',
        'input.mp4',
        '-vf',
        `crop=${cropArea.width}:${cropArea.height}:${cropArea.x}:${cropArea.y}`,
        '-c:a',
        'copy',
        'output.mp4',
      ]);
      const data = await ffmpeg.readFile('output.mp4');
      if (!data) {
        throw new Error('No output data');
      }
      const croppedVideoUrl = URL.createObjectURL(new Blob([data], { type: 'video/mp4' }));

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
      setCropHistory((prev) => prev.slice(0, -1));
    }
  };

  const downloadFilteredVideo = async (): Promise<void> => {
    if (!videoRef.current || !ffmpeg) return;

    try {
      setIsProcessing(true);
      const videoData = await fetch(videoUrl).then((r) => r.arrayBuffer());
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

      await ffmpeg.exec(['-i', 'input.mp4', '-vf', filterString, '-c:a', 'copy', 'output.mp4']);

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

  useEffect(() => {
    drawCropArea();
  }, [cropArea, originalVideoSize]);

  const drawCropArea = (): void => {
    if (!cropCanvasRef.current || !videoContainerRef.current) return;

    const canvas = cropCanvasRef.current;
    const container = videoContainerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / originalVideoSize.width;
    const scaleY = canvas.height / originalVideoSize.height;

    const x = cropArea.x * scaleX;
    const y = cropArea.y * scaleY;
    const width = cropArea.width * scaleX;
    const height = cropArea.height * scaleY;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.clearRect(x, y, width, height);

    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    const handleSize = 12;
    const handleRadius = handleSize / 2;

    const handles = [
      { x: x - handleRadius, y: y - handleRadius },
      { x: x + width - handleRadius, y: y - handleRadius },
      { x: x - handleRadius, y: y + height - handleRadius },
      { x: x + width - handleRadius, y: y + height - handleRadius },
    ];

    handles.forEach((handle) => {
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
    <main className={styles.container}>
      <section className={styles.fileInputContainer} aria-label="File input">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className={styles.fileInput}
        />
      </section>

      {videoUrl && (
        <section className={styles.playerContainer} aria-label="Video player section">
          <div className={styles.videoWithFiltersContainer}>
            <div ref={videoContainerRef} className={styles.videoContainer}>
              <video
                ref={videoRef}
                src={videoUrl}
                className={styles.video}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onLoadedData={() => {
                  if (videoRef.current && duration > 0) {
                    setIsMetadataLoaded(true);
                  }
                }}
                controls={false}
                style={getCssFilterStyle(filters)}
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
            <aside aria-label="Video filters">
              <VideoFilters
                filters={filters}
                setActiveFilters={setActiveFilters}
                setFilters={setFilters}
                onDownload={downloadFilteredVideo}
                isProcessing={isProcessing}
                ffmpegLoaded={ffmpegLoaded}
                activeFilters={activeFilters}
              />
            </aside>
          </div>
          <section aria-label="Video controls">
            <VideoControls
              isPlaying={isPlaying}
              onPlayPause={togglePlayPause}
              onRewind={rewindVideo}
              onForward={forwardVideo}
              isMuted={isMuted}
              onMute={toggleMute}
              volume={volume}
              onVolumeChange={handleVolumeChange}
              currentTime={currentTime}
              duration={duration}
              formatTime={formatTime}
            />
          </section>
          <section aria-label="Timeline">
            <Timeline
              videoUrl={videoUrl}
              isMetadataLoaded={isMetadataLoaded}
              videoRef={videoRef}
              thumbnailCanvasRef={thumbnailCanvasRef}
              duration={duration}
              currentTime={currentTime}
              trimStart={trimStart}
              trimEnd={trimEnd}
              setTrimStart={setTrimStart}
              setTrimEnd={setTrimEnd}
              setCurrentTime={setCurrentTime}
              formatTime={formatTime}
              isProcessing={isProcessing}
              ffmpegLoaded={ffmpegLoaded}
              downloadTrimmedVideo={downloadTrimmedVideo}
              downloadCroppedVideo={downloadCroppedVideo}
            />
          </section>
        </section>
      )}
    </main>
  );
};

export default VideoEditor;
