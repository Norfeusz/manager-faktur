// Import potrzebnych bibliotek
const express = require('express');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { PDFDocument } = require('pdf-lib');
const AdmZip = require('adm-zip');
const cors = require('cors');

const app = express();
const PORT = 3000;

// ##########################################################################
// ## UWAGA! ZNAJDŹ I ZAKTUALIZUJ PONIŻSZĄ ŚCIEŻKĘ DO PROGRAMU GIMP ##
// ##########################################################################
const GIMP_PATH = '"C:\\Program Files\\GIMP 2\\bin\\gimp-2.10.exe"';

app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'frontend')));
const FOLDER_SORTOWNIA = path.join(__dirname, '..', 'sortownia'); 
const FOLDER_PAKOWALNIA = path.join(__dirname, '..', 'pakowalnia');
const FOLDER_ZIP_SKLAD = path.join(__dirname, '..', 'ZIP Skład');
const FOLDER_UPLOADS = path.join(__dirname, '..', 'uploads');
app.use('/files', express.static(FOLDER_SORTOWNIA));
app.use('/packed', express.static(FOLDER_PAKOWALNIA));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const upload = multer({ dest: FOLDER_UPLOADS });

if (!fs.existsSync(FOLDER_UPLOADS)) fs.mkdirSync(FOLDER_UPLOADS);
if (!fs.existsSync(FOLDER_PAKOWALNIA)) fs.mkdirSync(FOLDER_PAKOWALNIA);
if (!fs.existsSync(FOLDER_SORTOWNIA)) fs.mkdirSync(FOLDER_SORTOWNIA);
if (!fs.existsSync(FOLDER_ZIP_SKLAD)) fs.mkdirSync(FOLDER_ZIP_SKLAD);


// --- ENDPOINTS ---

app.post('/api/open-in-gimp', (req, res) => {
    const { filename, folder } = req.body;
    if (!filename || !folder) return res.status(400).json({ message: 'Nie podano nazwy pliku lub folderu.' });
    
    const baseFolder = folder === 'sortownia' ? FOLDER_SORTOWNIA : FOLDER_PAKOWALNIA;
    const fullPath = path.join(baseFolder, filename);

    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: `Nie znaleziono pliku: ${fullPath}` });

    const command = `${GIMP_PATH} "${fullPath}"`;
    exec(command, (error) => {
        if (error) {
            console.error(`Błąd przy próbie uruchomienia GIMPa: ${error.message}`);
            return res.status(500).json({ message: `Nie udało się uruchomić GIMPa. Sprawdź, czy ścieżka w pliku server.js jest poprawna.` });
        }
        res.json({ message: `Polecenie otwarcia pliku ${filename} w GIMP zostało wysłane.` });
    });
});

app.post('/api/process-invoice', (req, res) => {
    const { originalFilename, newName, invoiceDate } = req.body;
    if (!originalFilename || !newName || !invoiceDate) return res.status(400).send('Brak wszystkich wymaganych danych.');
    const extension = path.extname(originalFilename);
    const oldPath = path.join(FOLDER_SORTOWNIA, originalFilename);
    const newFilename = `${invoiceDate}_${newName.replace(/ /g, '-')}${extension}`;
    const newPath = path.join(FOLDER_PAKOWALNIA, newFilename);
    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).send('Nie udało się przenieść pliku.');
        res.send({ message: `Plik ${newFilename} został pomyślnie przeniesiony.` });
    });
});

app.post('/api/custom-rename', (req, res) => {
    const { originalFilename, customFilename } = req.body;
    if (!originalFilename || !customFilename) return res.status(400).json({ message: 'Brak wszystkich wymaganych danych.' });
    const extension = path.extname(originalFilename);
    let finalCustomName = customFilename;
    if (!path.extname(finalCustomName)) {
        finalCustomName += extension;
    }
    const oldPath = path.join(FOLDER_SORTOWNIA, originalFilename);
    const newPath = path.join(FOLDER_PAKOWALNIA, finalCustomName);
    if (!fs.existsSync(oldPath)) return res.status(404).json({ message: `Plik ${originalFilename} nie został znaleziony.`});
    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).json({ message: 'Nie udało się przenieść pliku o niestandardowej nazwie.' });
        res.send({ message: `Plik został pomyślnie przeniesiony jako ${finalCustomName}.` });
    });
});

app.post('/api/add-to-zip', async (req, res) => {
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
});

app.get('/api/get-zips', async (req, res) => {
    try {
        const files = await fsp.readdir(FOLDER_ZIP_SKLAD);
        const zipFiles = files.filter(file => path.extname(file).toLowerCase() === '.zip');
        res.json(zipFiles);
    } catch (error) {
        res.status(500).send("Nie można odczytać listy archiwów.");
    }
});

app.post('/api/auto-move-file', (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).send('Nie podano nazwy pliku.');
    const oldPath = path.join(FOLDER_SORTOWNIA, filename);
    const newPath = path.join(FOLDER_PAKOWALNIA, path.basename(filename));
    if (!fs.existsSync(oldPath)) return res.status(404).send(`Plik ${filename} nie został znaleziony w sortowni.`);
    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).send('Nie udało się automatycznie przenieść pliku.');
        res.send({ message: `Plik ${path.basename(filename)} został automatycznie przeniesiony do pakowalni.` });
    });
});

app.post('/api/convert-to-pdf', upload.single('imageFile'), async (req, res) => {
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
});

app.post('/api/convert-server-file', async (req, res) => {
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
});

app.get('/api/get-files', async (req, res) => {
    try {
        const files = await fsp.readdir(FOLDER_SORTOWNIA);
        res.json(files);
    } catch (err) {
        res.status(500).send('Nie można odczytać folderu sortowni.');
    }
});

app.post('/api/pack-files', (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) return res.status(400).json({ message: 'Brak informacji o miesiącu lub roku.' });
    const polishMonths = ['styczen', 'luty', 'marzec', 'kwiecien', 'maj', 'czerwiec', 'lipiec', 'sierpien', 'wrzesien', 'pazdziernik', 'listopad', 'grudzien'];
    const monthName = polishMonths[month - 1]; 
    if (!monthName) return res.status(400).json({ message: 'Nieprawidłowy numer miesiąca.' });
    const zipName = `kamil-warchol-faktury-${monthName}-${year}.zip`;
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
});

app.get('/api/get-packed-files', (req, res) => {
    fs.readdir(FOLDER_PAKOWALNIA, (err, files) => {
        if (err) return res.status(500).send('Nie można odczytać folderu pakowalni.');
        res.json(files);
    });
});

app.post('/api/send-email', (req, res) => {
    const { zipFilename } = req.body;
    if (!zipFilename) return res.status(400).json({ message: 'Nie podano nazwy pliku ZIP.' });
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    if (!fs.existsSync(zipPath)) return res.status(404).json({ message: 'Nie znaleziono podanego pliku ZIP.' });
    res.send({ message: `E-mail z plikiem ${zipFilename} został pomyślnie wysłany (symulacja).` });
});

app.post('/api/move-to-sortownia', (req, res) => {
    const { filename } = req.body;
    const oldPath = path.join(FOLDER_PAKOWALNIA, filename);
    const newPath = path.join(FOLDER_SORTOWNIA, filename);
    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).json({ message: 'Błąd podczas przenoszenia pliku.' });
        res.json({ message: `Plik ${filename} został cofnięty do sortowni.` });
    });
});

app.delete('/api/delete-file', (req, res) => {
    const { filename, folder } = req.body;
    const baseFolder = folder === 'pakowalnia' ? FOLDER_PAKOWALNIA : FOLDER_SORTOWNIA;
    const filePath = path.join(baseFolder, filename);
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ message: 'Błąd podczas usuwania pliku.' });
        res.json({ message: `Plik ${filename} został usunięty.` });
    });
});

app.post('/api/rename-packed-file', (req, res) => {
    const { oldFilename, newFilename } = req.body;
    const oldPath = path.join(FOLDER_PAKOWALNIA, oldFilename);
    const newPath = path.join(FOLDER_PAKOWALNIA, newFilename);
    fs.rename(oldPath, newPath, (err) => {
        if (err) return res.status(500).json({ message: 'Błąd podczas zmiany nazwy.' });
        res.json({ message: 'Nazwa pliku została zmieniona.' });
    });
});

app.post('/api/add-packed-to-zip', async (req, res) => {
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
});

app.get('/api/get-zip-contents', (req, res) => {
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
});

app.post('/api/rename-zip', async (req, res) => {
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
});

app.post('/api/extract-zip', (req, res) => {
    const { zipFilename } = req.body;
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        const zip = new AdmZip(zipPath);
        // Poprawiona, bardziej niezawodna metoda wypakowywania
        zip.getEntries().forEach(entry => {
            zip.extractEntryTo(entry, FOLDER_SORTOWNIA, false, true);
        });
        res.json({ message: `Archiwum ${zipFilename} zostało wypakowane do sortowni.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/delete-zip', async (req, res) => {
    const { zipFilename } = req.body;
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        await fsp.unlink(zipPath);
        res.json({ message: `Archiwum ${zipFilename} zostało usunięte.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/delete-file-from-zip', (req, res) => {
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
});

app.post('/api/extract-single-file', (req, res) => {
    const { zipFilename, internalFilename } = req.body;
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    try {
        const zip = new AdmZip(zipPath);
        zip.extractEntryTo(internalFilename, FOLDER_SORTOWNIA, false, true);
        res.json({ message: `Plik ${internalFilename} został wypakowany do sortowni.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/view-file-in-zip', (req, res) => {
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
});

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});