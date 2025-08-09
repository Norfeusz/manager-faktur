// Import potrzebnych bibliotek
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const AdmZip = require('adm-zip');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'frontend')));
const FOLDER_SORTOWNIA = path.join(__dirname, '..', 'sortownia'); 
const FOLDER_PAKOWALNIA = path.join(__dirname, '..', 'pakowalnia');
const FOLDER_ZIP_SKLAD = path.join(__dirname, '..', 'ZIP Skład');
app.use('/files', express.static(FOLDER_SORTOWNIA));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync(FOLDER_PAKOWALNIA)) fs.mkdirSync(FOLDER_PAKOWALNIA);
if (!fs.existsSync(FOLDER_SORTOWNIA)) fs.mkdirSync(FOLDER_SORTOWNIA);
if (!fs.existsSync(FOLDER_ZIP_SKLAD)) fs.mkdirSync(FOLDER_ZIP_SKLAD);


// --- ENDPOINTS (PUNKTY DOSTĘPOWE API) ---

// Endpoint - listowanie istniejących plików ZIP
app.get('/api/get-zips', async (req, res) => {
    try {
        const files = await fsp.readdir(FOLDER_ZIP_SKLAD);
        const zipFiles = files.filter(file => path.extname(file).toLowerCase() === '.zip');
        res.json(zipFiles);
    } catch (error) {
        console.error("Błąd odczytu folderu ZIP Skład:", error);
        res.status(500).send("Nie można odczytać listy archiwów.");
    }
});

// Endpoint - dodawanie pliku do istniejącego ZIPa
app.post('/api/add-to-zip', async (req, res) => {
    const { originalFilename, newName, invoiceDate, zipFilename } = req.body;
    if (!originalFilename || !newName || !invoiceDate || !zipFilename) {
        return res.status(400).json({ message: 'Brak wszystkich wymaganych danych.' });
    }
    const sourcePath = path.join(FOLDER_SORTOWNIA, originalFilename);
    const targetZipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    const finalInvoiceName = `${invoiceDate}_${newName.replace(/ /g, '-')}.pdf`;
    try {
        if (!fs.existsSync(sourcePath)) throw new Error(`Plik źródłowy ${originalFilename} nie istnieje.`);
        if (!fs.existsSync(targetZipPath)) throw new Error(`Archiwum ${zipFilename} nie istnieje.`);
        const fileBuffer = await fsp.readFile(sourcePath);
        const zip = new AdmZip(targetZipPath);
        zip.addFile(finalInvoiceName, fileBuffer);
        zip.writeZip(targetZipPath);
        await fsp.unlink(sourcePath);
        res.json({ message: `Plik ${finalInvoiceName} został pomyślnie dodany do archiwum ${zipFilename}.` });
    } catch (error) {
        console.error("Błąd podczas dodawania do ZIP:", error);
        res.status(500).json({ message: `Nie udało się dodać pliku do archiwum: ${error.message}` });
    }
});

// Endpoint do automatycznego przeniesienia pliku
app.post('/api/auto-move-file', (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).send('Nie podano nazwy pliku.');
    const oldPath = path.join(FOLDER_SORTOWNIA, filename);
    const newPath = path.join(FOLDER_PAKOWALNIA, path.basename(filename));
    if (!fs.existsSync(oldPath)) return res.status(404).send(`Plik ${filename} nie został znaleziony w sortowni.`);
    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.error(`Błąd podczas automatycznego przenoszenia pliku ${filename}:`, err);
            return res.status(500).send('Nie udało się automatycznie przenieść pliku.');
        }
        res.send({ message: `Plik ${path.basename(filename)} został automatycznie przeniesiony do pakowalni.` });
    });
});

// Endpoint konwertera obrazów z uploadu
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
        res.json({ message: `Plik ${originalName}.pdf został pomyślnie utworzony i zapisany w sortowni.` });
    } catch (error) {
        console.error("Błąd konwersji:", error);
        if (req.file) await fsp.unlink(req.file.path).catch(e => console.error("Błąd usuwania pliku tymczasowego:", e));
        res.status(500).json({ message: error.message });
    }
});

// Endpoint do konwersji pliku już istniejącego na serwerze
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
        console.error("Błąd konwersji pliku serwera:", error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint do pobierania listy plików w sortowni
app.get('/api/get-files', async (req, res) => {
    const tempSubfolder = '.tmp.drivedownload';
    const tempDirPath = path.join(FOLDER_SORTOWNIA, tempSubfolder);
    let allFiles = [];
    try {
        const mainFiles = await fsp.readdir(FOLDER_SORTOWNIA);
        allFiles.push(...mainFiles.filter(file => file !== tempSubfolder));
        if (fs.existsSync(tempDirPath)) {
            const tempFiles = await fsp.readdir(tempDirPath);
            const tempFilesWithPrefix = tempFiles.map(file => path.join(tempSubfolder, file));
            allFiles.push(...tempFilesWithPrefix);
        }
        res.json(allFiles);
    } catch (err) {
        console.error("Błąd odczytu folderu sortowni:", err);
        return res.status(500).send('Nie można odczytać folderu sortowni.');
    }
});

// Endpoint do zmiany nazwy i przeniesienia pliku
app.post('/api/process-invoice', (req, res) => {
    const { originalFilename, newName, invoiceDate } = req.body;
    if (!originalFilename || !newName || !invoiceDate) return res.status(400).send('Brak wszystkich wymaganych danych.');
    const oldPath = path.join(FOLDER_SORTOWNIA, originalFilename);
    const newFilename = `${invoiceDate}_${newName.replace(/ /g, '-')}.pdf`;
    const newPath = path.join(FOLDER_PAKOWALNIA, newFilename);
    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Nie udało się przenieść pliku.');
        }
        res.send({ message: `Plik ${newFilename} został pomyślnie przeniesiony.` });
    });
});

// Endpoint do pakowania plików
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
        console.log(`Archiwum ${zipName} stworzone. Rozmiar: ${archive.pointer()} bajtów.`);
        try {
            const filesToClear = await fsp.readdir(FOLDER_PAKOWALNIA);
            const unlinkPromises = filesToClear.map(file => fsp.unlink(path.join(FOLDER_PAKOWALNIA, file)));
            await Promise.all(unlinkPromises);
            console.log(`Folder ${FOLDER_PAKOWALNIA} został wyczyszczony.`);
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

// Endpoint do pobierania listy plików w pakowalni
app.get('/api/get-packed-files', (req, res) => {
    fs.readdir(FOLDER_PAKOWALNIA, (err, files) => {
        if (err) {
            console.error("Błąd odczytu folderu pakowalni:", err);
            return res.status(500).send('Nie można odczytać folderu pakowalni.');
        }
        res.json(files);
    });
});

// Endpoint do wysyłania maila
app.post('/api/send-email', (req, res) => {
    const { zipFilename } = req.body;
    if (!zipFilename) return res.status(400).json({ message: 'Nie podano nazwy pliku ZIP.' });
    const zipPath = path.join(FOLDER_ZIP_SKLAD, zipFilename);
    if (!fs.existsSync(zipPath)) return res.status(404).json({ message: 'Nie znaleziono podanego pliku ZIP.' });
    console.log(`Symulacja wysyłki maila z załącznikiem: ${zipPath}`);
    res.send({ message: `E-mail z plikiem ${zipFilename} został pomyślnie wysłany (symulacja).` });
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});