export function parseMySQLPoint(point: string) {
    const match = point.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);

    if (!match) return null;

    return {
        type: 'Point',
        coordinates: [
            parseFloat(match[1]), // longitude
            parseFloat(match[2]), // latitude
        ],
    };
}