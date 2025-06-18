import React, { FC } from 'react';
import styles from './VideoFilters.module.scss';

interface FilterState {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    sepia: number;
    grayscale: number;
    invert: number;
    hue: number;
}

interface VideoFiltersProps {
    filters: FilterState;
    onFilterChange: (filterName: string, value: number) => void;
    onReset: () => void;
    onDownload: () => void;
    isProcessing: boolean;
    ffmpegLoaded: boolean;
    activeFilters: string[];
}

const VideoFilters: FC<VideoFiltersProps> = ({
    filters,
    onFilterChange,
    onReset,
    onDownload,
    isProcessing,
    ffmpegLoaded,
    activeFilters
}) => {
    return (
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
                        onChange={(e) => onFilterChange('brightness', parseFloat(e.target.value))}
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
                        onChange={(e) => onFilterChange('contrast', parseFloat(e.target.value))}
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
                        onChange={(e) => onFilterChange('saturation', parseFloat(e.target.value))}
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
                        onChange={(e) => onFilterChange('blur', parseFloat(e.target.value))}
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
                        onChange={(e) => onFilterChange('sepia', parseFloat(e.target.value))}
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
                        onChange={(e) => onFilterChange('grayscale', parseFloat(e.target.value))}
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
                        onChange={(e) => onFilterChange('invert', parseFloat(e.target.value))}
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
                        onChange={(e) => onFilterChange('hue', parseFloat(e.target.value))}
                    />
                    <span>{filters.hue}</span>
                </div>
            </div>
            <div className={styles.filterActions}>
                <button
                    onClick={onReset}
                    className={styles.actionButton}
                >
                    Reset Filters
                </button>
                <button
                    onClick={onDownload}
                    disabled={!ffmpegLoaded || isProcessing || activeFilters.length === 0}
                    className={`${styles.actionButton} ${(!ffmpegLoaded || isProcessing || activeFilters.length === 0) ? styles.disabledButton : ''}`}
                >
                    {isProcessing ? 'Processing...' : 'Download Filtered Video'}
                </button>
            </div>
        </div>
    );
};

export default VideoFilters; 