// Removing uploaded photos from the S3 bucket.
//
// Only files in our own bucket are touched: a URL is turned back into its key
// (profiles/..., listings/..., housing/...) and anything that doesn't look like
// one of ours is skipped. Best effort: a failure is logged, never thrown, so an
// account deletion doesn't fail because storage was slow.
const { DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const logger = require('./logger');

const log = logger.createLogger('storage');
const OUR_FOLDERS = ['profiles/', 'listings/', 'housing/'];

// "https://bucket.s3.eu-central-1.amazonaws.com/listings/123-ab.jpg" -> "listings/123-ab.jpg"
function keyFromUrl(url) {
    if (typeof url !== 'string' || !url) return null;
    let path;
    try { path = decodeURIComponent(new URL(url).pathname); } catch { return null; }
    path = path.replace(/^\/+/, '');
    const bucket = process.env.AWS_BUCKET_NAME;
    // path-style URLs have the bucket name first: /bucket/listings/...
    if (bucket && path.startsWith(`${bucket}/`)) path = path.slice(bucket.length + 1);
    return OUR_FOLDERS.some(folder => path.startsWith(folder)) && !path.includes('..') ? path : null;
}

async function deleteStoredFiles(urls, client) {
    const keys = [...new Set((urls || []).map(keyFromUrl).filter(Boolean))];
    if (!keys.length || !process.env.AWS_BUCKET_NAME) return 0;
    const s3 = client || require('../configs/s3Config.js').s3;
    let removed = 0;
    // S3 takes up to 1000 keys per request
    for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000);
        try {
            await s3.send(new DeleteObjectsCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true },
            }));
            removed += batch.length;
        } catch (err) {
            log.error({ err, count: batch.length }, 'could not delete stored photos');
        }
    }
    return removed;
}

module.exports = { keyFromUrl, deleteStoredFiles };
