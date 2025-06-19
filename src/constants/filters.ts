interface FilterRenderData {
    title: string;
    min: string;
    max: string;
    step: string;
}

export const filtersData: FilterRenderData[] = [
    {
        title: 'Brightness',
        min: '-1',
        max: '1',
        step: '0.1'
    },
    {
        title: 'Contrast',
        min: '0',
        max: '2',
        step: '0.1'
    },
    {
        title: 'Saturation',
        min: '0',
        max: '2',
        step: '0.1'
    },
    {
        title: 'Blur',
        min: '0',
        max: '10',
        step: '0.5'
    },
    {
        title: 'Sepia',
        min: '0',
        max: '1',
        step: '0.1'
    },
    {
        title: 'Grayscale',
        min: '0',
        max: '1',
        step: '0.1'
    },
    {
        title: 'Invert',
        min: '0',
        max: '1',
        step: '0.1'
    },
    {
        title: 'Hue',
        min: '-180',
        max: '180',
        step: '1'
    },

    ]
