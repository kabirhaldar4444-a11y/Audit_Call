const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads/audio', 'uploads/data'];
uploadDirs.forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn(`⚠️  Could not create ${dir}. Vercel environment is read-only.`);
  }
});

// Configure storage for audio files
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/audio');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure storage for data files (Excel/CSV)
const dataStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/data');
  },
  filename: (req, file, cb) => {
    cb(null, 'data-' + Date.now() + path.extname(file.originalname));
  },
});

const audioUpload = multer({
  storage: audioStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed!'), false);
    }
  },
});

const dataUpload = multer({
  storage: dataStorage,
  fileFilter: (req, file, cb) => {
    const filetypes = /csv|xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only Excel and CSV files are allowed!'));
  },
});

module.exports = { audioUpload, dataUpload };
