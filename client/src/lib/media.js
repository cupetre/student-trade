// Turns a stored image value into something an <img> can load.
// S3 uploads are saved as full URLs already; older local uploads are paths
// like "/uploads/x.jpg" that need the API address in front.
export function resolveMediaUrl(path) {
    if (!path) return null;
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return `${import.meta.env.VITE_API_URL || ''}${path}`;
}
