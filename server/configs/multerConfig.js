const multer = require('multer');

const profilePicStorage = multer.diskStorage({
    destination: './uploads/profiles/',
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const listingStorage = multer.diskStorage({
    destination: './uploads/listings/',
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload1 = multer({ storage: profilePicStorage });
const upload2 = multer({ storage: listingStorage });

module.exports = { upload1, upload2 };