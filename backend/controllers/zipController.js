const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { FOLDER_SORTOWNIA, FOLDER_PAKOWALNIA, FOLDER_ZIP_SKLAD } = require('../config/paths');

exports.getZips = async (req, res) => {
    try {
        const files = await fsp.readdir(FOLDER_ZIP_SKLAD);
        const zipFiles = files.filter(file => path.extname(file).toLowerCase() === '.zip');
        res.json(zipFiles);
    } catch (error) {
        res.status(500).send("Nie można odczytać listy archiwów.");
    }
};

exports.packFiles = (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) return res.status(400).json({ message: 'Brak informacji o miesiącu lub roku.' });
    const polishMonths = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
    const monthName = polishMonths[month - 1]; 
    if (!monthName) return res.status(400).json({ message: 'Nieprawidłowy numer miesiąca.' });
    const zipName = `kamil-warchoł-faktury-${monthName}-${year}.zip`;
    const outputPath = path.join(FOLDER_ZIP_SKLAD, zipName);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', async () => {
        try {
            const filesToClear = await fsp.readdir(FOLDER_PAKOWALNIA);
            const unlinkPromises = filesToClear.map(file => fsp.unlink(path.join(FOLDER_PAKOWALNIA, file)));
            await Promise.all(unlinkPromises);
        } catch (clearErr) {
            console.error("Błąd podczas czyszczenia folderu pakowalni:", clearErr);
        }
    });
    archive.on('error', (err) => res.status(500).json({ message: 'Błąd podczas tworzenia archiwum.' }));
    archive.pipe(output);
    archive.directory(FOLDER_PAKOWALNIA, false);
    archive.finalize();
    res.send({ message: `Rozpoczęto tworzenie archiwum ${zipName}.`, zipFilename: zipName });
};

exports.addToZip = async (req, res) => {
    const { originalFilename, newName, invoiceDate, zipFilename } = req.body;
    if (!originalFilename || !newName || !invoiceDate || !zipFilename) return res.status(400).json({ message: 'Brak wszystkich wymaganych danych.' });
    const extension = path.extname(originalFilename);
    const sourcePath = path.join(FOLDER_SORTOWNIA, originalFilename);
    const targetZipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    const finalInvoiceName = `${invoiceDate}_${newName.replace(/ /g, '-')}${extension}`;
    try {
        if (!fs.existsSync(sourcePath)) throw new Error(`Plik źródłowy ${originalFilename} nie istnieje.`);
        if (!fs.existsSync(targetZipPath)) throw new Error(`Archiwum ${zipFilename} nie istnieje.`);
        const fileBuffer = await fsp.readFile(sourcePath);
        const zip = new AdmZip(targetZipPath);
        zip.addFile(finalInvoiceName, fileBuffer);
        zip.writeZip(targetZipPath);
        await fsp.unlink(sourcePath);
        res.json({ message: `Plik ${finalInvoiceName} został dodany do archiwum ${zipFilename}.` });
    } catch (error) {
        res.status(500).json({ message: `Nie udało się dodać pliku do archiwum: ${error.message}` });
    }
};

exports.getZipContents = (req, res) => {
    const { zipFilename } = req.query;
    if (!zipFilename) return res.status(400).json({ message: "Nie podano nazwy archiwum." });
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        if (!fs.existsSync(zipPath)) throw new Error("Archiwum nie istnieje.");
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries().map(entry => ({ name: entry.entryName, isDirectory: entry.isDirectory }));
        res.json(zipEntries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.renameZip = async (req, res) => {
    const { oldZipFilename, newZipFilename } = req.body;
    if (!oldZipFilename || !newZipFilename) return res.status(400).json({ message: "Brak danych." });
    const oldPath = path.join(FOLDER_ZIP_SKLAD, oldZipFilename);
    const newPath = path.join(FOLDER_ZIP_SKLAD, newZipFilename);
    try {
        await fsp.rename(oldPath, newPath);
        res.json({ message: 'Nazwa archiwum została zmieniona.' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas zmiany nazwy archiwum.' });
    }
};

exports.extractZip = (req, res) => {
    const { zipFilename } = req.body;
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        const zip = new AdmZip(zipPath);
        zip.getEntries().forEach(entry => {
            if (!entry.isDirectory) {
                zip.extractEntryTo(entry, FOLDER_SORTOWNIA, false, true);
            }
        });
        res.json({ message: `Archiwum ${zipFilename} zostało wypakowane do sortowni.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteZip = async (req, res) => {
    const { zipFilename } = req.body;
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        await fsp.unlink(zipPath);
        res.json({ message: `Archiwum ${zipFilename} zostało usunięte.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteFileFromZip = (req, res) => {
    const { zipFilename, internalFilename } = req.body;
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        const zip = new AdmZip(zipPath);
        zip.deleteFile(internalFilename);
        zip.writeZip(zipPath);
        res.json({ message: `Plik ${internalFilename} został usunięty z archiwum.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.extractSingleFile = (req, res) => {
    const { zipFilename, internalFilename } = req.body;
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        const zip = new AdmZip(zipPath);
        zip.extractEntryTo(internalFilename, FOLDER_SORTOWNIA, false, true);
        res.json({ message: `Plik ${internalFilename} został wypakowany do sortowni.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.viewFileInZip = (req, res) => {
    const { zipFilename, internalFilename } = req.query;
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        const zip = new AdmZip(zipPath);
        const fileData = zip.readFile(internalFilename);
        if (fileData) {
            res.contentType(path.extname(internalFilename));
            res.send(fileData);
        } else {
            throw new Error('Nie znaleziono pliku w archiwum.');
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addPackedToZip = async (req, res) => {
    const { packedFilename, zipFilename } = req.body;
    const sourcePath = path.join(FOLDER_PAKOWALNIA, packedFilename);
    const targetZipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        const fileBuffer = await fsp.readFile(sourcePath);
        const zip = new AdmZip(targetZipPath);
        zip.addFile(packedFilename, fileBuffer);
        zip.writeZip(targetZipPath);
        res.json({ message: `Plik ${packedFilename} został dodany do archiwum ${zipFilename}.` });
    } catch (error) {
        res.status(500).json({ message: `Nie udało się dodać pliku do archiwum: ${error.message}` });
    }
};