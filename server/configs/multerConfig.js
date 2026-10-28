const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3 } = require('./s3Config.js');
const path = require('path');
const crypto = require('crypto');

// Profile pictures and marketplace photos: one image, max 5 MB.
// Random file names (the original name is never used: it could contain
// anything), and the right content type so browsers display the image.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function imageOnly(req, file, cb) {
    if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Photos must be JPG, PNG or WebP');
    err.code = 'BAD_TYPE';
    cb(err);
}

function singleImageUpload(folder) {
    return multer({
        storage: multerS3({
            s3,
            bucket: process.env.AWS_BUCKET_NAME,
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: function (req, file, cb) {
                const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
                cb(null, `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
            },
        }),
        limits: { fileSize: 5 * 1024 * 1024, files: 1 },
        fileFilter: imageOnly,
    });
}

const upload1 = singleImageUpload('profiles');
const upload2 = singleImageUpload('listings');

// Housing photos: images only, max 8 MB each, max 12 per request.
const { MAX_HOUSING_PHOTOS } = require('../lib/housingOptions');

const housingUpload = multer({
    storage: multerS3({
        s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE, // so browsers show the image instead of downloading it
        key: function (req, file, cb) {
            const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
            cb(null, `housing/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
        },
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: MAX_HOUSING_PHOTOS },
    fileFilter: imageOnly,
});

// Turns upload problems into a clear 400 answer instead of a generic 500
function uploadHousingPhotos(req, res, next) {
    housingUpload.array('photos', MAX_HOUSING_PHOTOS)(req, res, (err) => {
        if (!err) return next();
        const message =
            err.code === 'LIMIT_FILE_SIZE' ? 'Each photo can be at most 8 MB'
            : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? `You can upload at most ${MAX_HOUSING_PHOTOS} photos at once`
            : err.code === 'BAD_TYPE' ? 'Photos must be JPG, PNG or WebP'
            : 'Photo upload failed. Please try again.';
        if (req.log) req.log.warn({ err }, 'housing photo upload rejected');
        res.status(400).json({ error: message, fields: { photos: message } });
    });
}

module.exports = { upload1, upload2, uploadHousingPhotos, MAX_HOUSING_PHOTOS };