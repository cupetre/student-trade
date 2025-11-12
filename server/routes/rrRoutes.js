const express = require('express');
const router = express.Router();
const { authenticationToken } = require('../configs/authConfig');
const { submitReport } = require('../controllers/rrController');

router.post('/submit_report', authenticationToken, submitReport);

module.exports = router;