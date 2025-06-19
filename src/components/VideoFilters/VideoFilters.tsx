import React, { FC } from 'react';
import styles from './VideoFilters.module.scss';
import {Filters} from "@/types/types";
import {filtersData} from "@/constants/filters";

interface VideoFiltersProps {
    filters: Filters;
    onDownload: () => void;
    setFilters: (value: (((prevState: Filters) => Filters) | Filters)) => void;
    setActiveFilters: (value: (((prevState: string[]) => string[]) | string[])) => void;
    isProcessing: boolean;
    ffmpegLoaded: boolean;
    activeFilters: string[];
}

const VideoFilters: FC<VideoFiltersProps> = ({
    setFilters,
    setActiveFilters,
    filters,
    onDownload,
    isProcessing,
    ffmpegLoaded,
    activeFilters
}) => {

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

    return (
        <section className={styles.filtersSection} aria-label="Video filters">
            <h3>Video Filters</h3>
            <fieldset className={styles.filtersGrid} aria-label="Filter controls">
                <legend className="sr-only">Adjust video filters</legend>
                {filtersData.map(el => {
                    const filterField = el.title.toLowerCase() as keyof Filters
                    return (
                        <div className={styles.filterControl}>
                            <label>{el.title}</label>
                            <input
                                type="range"
                                min={el.min}
                                max={el.max}
                                step={el.step}
                                value={filters[filterField]}
                                onChange={(e) => handleFilterChange(filterField, parseFloat(e.target.value))}
                            />
                            <span>{filters.brightness}</span>
                        </div>
                    )
                })}
            </fieldset>
            <footer className={styles.filterActions} aria-label="Filter actions">
                <button
                    onClick={resetFilters}
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
            </footer>
        </section>
    );
};

export default VideoFilters;
