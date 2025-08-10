const fs = require('fs');
const { FOLDER_SORTOWNIA, FOLDER_PAKOWALNIA, FOLDER_ZIP_SKLAD, FOLDER_UPLOADS } = require('../config/paths');
const initFolders = () => {
  const folders = [FOLDER_SORTOWNIA, FOLDER_PAKOWALNIA, FOLDER_ZIP_SKLAD, FOLDER_UPLOADS];
  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  });
};
module.exports = { initFolders };