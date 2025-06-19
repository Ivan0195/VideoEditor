import React, { FC } from 'react';
import styles from './VideoControls.module.scss';

interface VideoControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onRewind: () => void;
  onForward: () => void;
  isMuted: boolean;
  onMute: () => void;
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentTime: number;
  duration: number;
  formatTime: (time: number) => string;
}

const VideoControls: FC<VideoControlsProps> = ({
  isPlaying,
  onPlayPause,
  onRewind,
  onForward,
  isMuted,
  onMute,
  volume,
  onVolumeChange,
  currentTime,
  duration,
  formatTime,
}) => (
  <div className={styles.controls}>
    <button onClick={onRewind} className={styles.controlButton}>
      -5s
    </button>
    <button onClick={onPlayPause} className={styles.controlButton}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
    <button onClick={onForward} className={styles.controlButton}>
      +5s
    </button>
    <button onClick={onMute} className={styles.controlButton}>
      {isMuted ? 'Unmute' : 'Mute'}
    </button>
    <div className={styles.volumeContainer}>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={onVolumeChange}
        className={styles.volume}
      />
    </div>
    <span className={styles.timeDisplay}>
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  </div>
);

export default VideoControls;
