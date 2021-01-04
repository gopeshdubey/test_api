const multer = require('multer');

// Initialization of Multer to store profile pic of users
module.exports  = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        console.log('file :::::', file);
        cb(null, file.fieldname + '_' + Date.now() + '_' + file.originalname)
    }
})