const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const { GIMP_PATH } = require('../config/config');
const { FOLDER_SORTOWNIA, FOLDER_PAKOWALNIA } = require('../config/paths');

exports.getFiles = async (req, res) => {
    try {
        const files = await fsp.readdir(FOLDER_SORTOWNIA);
        res.json(files);
    } catch (err) {
        res.status(500).send('Nie można odczytać folderu sortowni.');
    }
};

exports.getPackedFiles = (req, res) => {
    fs.readdir(FOLDER_PAKOWALNIA, (err, files) => {
        if (err) return res.status(500).send('Nie można odczytać folderu pakowalni.');
        res.json(files);
    });
};

exports.processInvoice = async (req, res) => {
    const { originalFilename, newName, invoiceDate } = req.body;
    if (!originalFilename || !newName || !invoiceDate) {
        return res.status(400).send('Brak wszystkich wymaganych danych.');
    }
    const extension = path.extname(originalFilename);
    const oldPath = path.join(FOLDER_SORTOWNIA, originalFilename);
    const newFilename = `${invoiceDate}_${newName.replace(/ /g, '-')}${extension}`;
    const newPath = path.join(FOLDER_PAKOWALNIA, newFilename);
    try {
        await fsp.rename(oldPath, newPath);
        res.send({ message: `Plik ${newFilename} został pomyślnie przeniesiony.` });
    } catch (err) {
        res.status(500).send('Nie udało się przenieść pliku.');
    }
};

exports.customRename = async (req, res) => {
    const { originalFilename, customFilename } = req.body;
    if (!originalFilename || !customFilename) {
        return res.status(400).json({ message: 'Brak wszystkich wymaganych danych.' });
    }
    const extension = path.extname(originalFilename);
    let finalCustomName = customFilename;
    if (!path.extname(finalCustomName)) {
        finalCustomName += extension;
    }
    const oldPath = path.join(FOLDER_SORTOWNIA, originalFilename);
    const newPath = path.join(FOLDER_PAKOWALNIA, finalCustomName);
    try {
        if (!fs.existsSync(oldPath)) {
            return res.status(404).json({ message: `Plik ${originalFilename} nie został znaleziony.` });
        }
        await fsp.rename(oldPath, newPath);
        res.send({ message: `Plik został pomyślnie przeniesiony jako ${finalCustomName}.` });
    } catch (err) {
        res.status(500).json({ message: 'Nie udało się przenieść pliku o niestandardowej nazwie.' });
    }
};

exports.moveToSortownia = (req, res) => {
    const { filename } = req.body;
    const oldPath = path.join(FOLDER_PAKOWALNIA, filename);
    const newPath = path.join(FOLDER_SORTOWNIA, filename);
    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).json({ message: 'Błąd podczas przenoszenia pliku.' });
        res.json({ message: `Plik ${filename} został cofnięty do sortowni.` });
    });
};

exports.deleteFile = (req, res) => {
    const { filename, folder } = req.body;
    if (!filename || !folder) return res.status(400).json({ message: 'Nie podano nazwy pliku lub folderu.' });
    const baseFolder = folder === 'pakowalnia' ? FOLDER_PAKOWALNIA : FOLDER_SORTOWNIA;
    const filePath = path.join(baseFolder, filename);
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ message: 'Błąd podczas usuwania pliku.' });
        res.json({ message: `Plik ${filename} został usunięty.` });
    });
};

exports.renamePackedFile = (req, res) => {
    const { oldFilename, newFilename } = req.body;
    if (!oldFilename || !newFilename) return res.status(400).json({ message: 'Nie podano starej lub nowej nazwy pliku.' });
    const oldPath = path.join(FOLDER_PAKOWALNIA, oldFilename);
    const newPath = path.join(FOLDER_PAKOWALNIA, newFilename);
    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).json({ message: 'Błąd podczas zmiany nazwy.' });
        res.json({ message: 'Nazwa pliku została zmieniona.' });
    });
};

exports.convertToPdf = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Nie przesłano pliku.' });
    try {
        const imagePath = req.file.path;
        const imageBytes = await fsp.readFile(imagePath);
        const pdfDoc = await PDFDocument.create();
        let embeddedImage;
        if (req.file.mimetype === 'image/jpeg') embeddedImage = await pdfDoc.embedJpg(imageBytes);
        else if (req.file.mimetype === 'image/png') embeddedImage = await pdfDoc.embedPng(imageBytes);
        else throw new Error('Nieobsługiwany format pliku. Proszę użyć PNG lub JPG.');
        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, { x: 0, y: 0, width: embeddedImage.width, height: embeddedImage.height });
        const pdfBytes = await pdfDoc.save();
        const originalName = path.parse(req.file.originalname).name;
        const pdfOutputPath = path.join(FOLDER_SORTOWNIA, `${originalName}.pdf`);
        await fsp.writeFile(pdfOutputPath, pdfBytes);
        await fsp.unlink(imagePath);
        res.json({ message: `Plik ${originalName}.pdf został pomyślnie utworzony.` });
    } catch (error) {
        if (req.file) await fsp.unlink(req.file.path).catch(e => console.error("Błąd usuwania pliku tymczasowego:", e));
        res.status(500).json({ message: error.message });
    }
};

exports.convertServerFile = async (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ message: 'Nie podano nazwy pliku.' });
    const imagePath = path.join(FOLDER_SORTOWNIA, filename);
    try {
        if (!fs.existsSync(imagePath)) throw new Error('Plik obrazu nie istnieje na serwerze.');
        const imageBytes = await fsp.readFile(imagePath);
        const pdfDoc = await PDFDocument.create();
        let embeddedImage;
        const fileExtension = path.extname(filename).toLowerCase();
        if (fileExtension === '.jpg' || fileExtension === '.jpeg') embeddedImage = await pdfDoc.embedJpg(imageBytes);
        else if (fileExtension === '.png') embeddedImage = await pdfDoc.embedPng(imageBytes);
        else throw new Error('Nieobsługiwany format pliku.');
        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, { x: 0, y: 0, width: embeddedImage.width, height: embeddedImage.height });
        const pdfBytes = await pdfDoc.save();
        const originalName = path.parse(filename).name;
        const pdfOutputPath = path.join(FOLDER_SORTOWNIA, `${originalName}.pdf`);
        await fsp.writeFile(pdfOutputPath, pdfBytes);
        await fsp.unlink(imagePath);
        res.json({ message: `Plik ${originalName}.pdf został pomyślnie utworzony.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.openInGimp = (req, res) => {
    const { filename, folder } = req.body;
    if (!filename || !folder) return res.status(400).json({ message: 'Nie podano nazwy pliku lub folderu.' });
    const baseFolder = folder === 'sortownia' ? FOLDER_SORTOWNIA : FOLDER_PAKOWALNIA;
    const fullPath = path.join(baseFolder, filename);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: `Nie znaleziono pliku: ${fullPath}` });
    const command = `${GIMP_PATH} "${fullPath}"`;
    exec(command, (error) => {
        if (error) {
            console.error(`Błąd przy próbie uruchomienia GIMPa: ${error.message}`);
            return res.status(500).json({ message: `Nie udało się uruchomić GIMPa. Sprawdź, czy ścieżka w config.js jest poprawna.` });
        }
        res.json({ message: `Polecenie otwarcia pliku ${filename} w GIMP zostało wysłane.` });
    });
};

exports.autoMoveFile = (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).send('Nie podano nazwy pliku.');
    const oldPath = path.join(FOLDER_SORTOWNIA, filename);
    const newPath = path.join(FOLDER_PAKOWALNIA, path.basename(filename));
    if (!fs.existsSync(oldPath)) return res.status(404).send(`Plik ${filename} nie został znaleziony w sortowni.`);
    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).send('Nie udało się automatycznie przenieść pliku.');
        res.send({ message: `Plik ${path.basename(filename)} został automatycznie przeniesiony do pakowalni.` });
    });
};