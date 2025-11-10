const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('./s3Config.js');
const path = require('path');

const upload1 = multer({
    storage:multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: 'public-read',
        key: function ( req, file, cb ) {
            const fileName = `profiles/${Date.now()}-${file.originalname}`;
            cb(null, fileName);
        }
    })
});

const upload2 = multer({
    storage: multerS3({ 
        s3:s3, 
        bucket: process.env.AWS_BUCKET_NAME,
        acl:'public-read',
        key: function( req, file , cb) {
            const fileName = `listings/${Date.now()}-${file.originalname}`;
            cb(null, fileName);
        }
    })
});

module.exports = { upload1, upload2 };