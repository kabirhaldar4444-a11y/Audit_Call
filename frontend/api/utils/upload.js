const multer = require('multer');
const path = require('path');

// Configure storage in memory for Vercel (Ready-only filesystem)
const storage = multer.memoryStorage();

const audioUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

const dataUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /csv|xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only Excel and CSV files are allowed!'));
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

module.exports = { audioUpload, dataUpload };
