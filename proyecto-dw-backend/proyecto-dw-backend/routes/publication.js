'use strict'

let express = require('express');
let PublicationController = require('../controllers/publication');
let api = express.Router();
let md_auth = require('../middlewares/authenticate');

let multipart = require('connect-multiparty');

let crypto = require('crypto');
let multer = require('multer');

const storage = multer.diskStorage({
    destination(req, file, cb){
        cb(null, './upload/publications');
    },
    filename(req, file = {}, cb){
        const {originalname} = file;
        const fileExtension = (originalname.match(/\.+[\S]+$/) || [])[0];
        crypto.pseudoRandomBytes(16, function(err, raw){
            cb(null, raw.toString("hex") + Date.now() + fileExtension);
        });
    },
});

let mul_upload = multer({dest: './upload/publications', storage});


api.get('/probando-pub', md_auth.ensureAuth, PublicationController.test);
api.post('/publication', md_auth.ensureAuth, PublicationController.savePublication);
api.get('/publications/:page?', md_auth.ensureAuth, PublicationController.getPublications);
api.get('/publications-user/:user/:page?', md_auth.ensureAuth, PublicationController.getPublicationsUser);
api.get('/publication/:id', md_auth.ensureAuth, PublicationController.getPublication);
api.delete('/publication/:id', md_auth.ensureAuth, PublicationController.deletePublication);
api.post('/upload-image-pub/:id', [md_auth.ensureAuth, mul_upload.single('image')], PublicationController.uploadImage);
api.get('/get-image-pub/:imageFile', PublicationController.getImageFile);

module.exports = api;