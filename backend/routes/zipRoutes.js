const express = require('express');
const router = express.Router();
const zipController = require('../controllers/zipController');

router.get('/get-zips', zipController.getZips);
router.post('/pack-files', zipController.packFiles);
router.post('/add-to-zip', zipController.addToZip);
router.get('/get-zip-contents', zipController.getZipContents);
router.post('/rename-zip', zipController.renameZip);
router.post('/extract-zip', zipController.extractZip);
router.delete('/delete-zip', zipController.deleteZip);
router.post('/delete-file-from-zip', zipController.deleteFileFromZip);
router.post('/extract-single-file', zipController.extractSingleFile);
router.get('/view-file-in-zip', zipController.viewFileInZip);
router.post('/add-packed-to-zip', zipController.addPackedToZip);

module.exports = router;