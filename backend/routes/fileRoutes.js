const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/fileController');
const { FOLDER_UPLOADS } = require('../config/paths');

const upload = multer({ dest: FOLDER_UPLOADS });

router.get('/get-files', fileController.getFiles);
router.get('/get-packed-files', fileController.getPackedFiles); // Ta trasa była źle umieszczona
router.post('/process-invoice', fileController.processInvoice);
router.post('/custom-rename', fileController.customRename);
router.post('/auto-move-file', fileController.autoMoveFile);
router.post('/move-to-sortownia', fileController.moveToSortownia);
router.delete('/delete-file', fileController.deleteFile);
router.post('/rename-packed-file', fileController.renamePackedFile);
router.post('/convert-to-pdf', upload.single('imageFile'), fileController.convertToPdf);
router.post('/convert-server-file', fileController.convertServerFile);
router.post('/open-in-gimp', fileController.openInGimp);

module.exports = router;