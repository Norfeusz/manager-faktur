const express = require('express');
const cors = require('cors');
const path = require('path');
const { initFolders } = require('./utils/initFolders');
const { FOLDER_FRONTEND, FOLDER_SORTOWNIA, FOLDER_PAKOWALNIA } = require('./config/paths');

const app = express();
const PORT = 3000;

// Inicjalizacja folderów na starcie
initFolders();

// Importujemy TYLKO GŁÓWNY router
const apiRoutes = require('./routes/apiRoutes');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statyczne pliki
app.use(express.static(FOLDER_FRONTEND));
app.use('/files', express.static(FOLDER_SORTOWNIA));
app.use('/packed', express.static(FOLDER_PAKOWALNIA));

// Podłączenie wszystkich endpointów pod wspólnym prefiksem /api
app.use('/api', apiRoutes);

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});