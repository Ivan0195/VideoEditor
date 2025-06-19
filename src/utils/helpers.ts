import React from "react";
import {Filters} from "@/types/types";

export const getCssFilterStyle = (filters: Filters): React.CSSProperties => {
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
