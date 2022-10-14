'use strict'

let express = require('express');
let UserController = require("../controllers/user");

let api = express.Router();
let md_auth = require('../middlewares/authenticate');

// Agregar el código
let crypto = require('crypto');
let multer = require('multer');

const storage = multer.diskStorage({
    destination(req, file, cb){
        cb(null, './upload/users');
    },
    filename(req, file = {}, cb){
        const {originalname} = file;
        const fileExtension = (originalname.match(/\.+[\S]+$/) || [])[0];
        crypto.pseudoRandomBytes(16, function(err, raw){
            cb(null, raw.toString("hex") + Date.now() + fileExtension);
        });
    },
});

let mul_upload = multer({dest:"./upload/users", storage});



api.get('/home', UserController.home);
api.get('/pruebas', md_auth.ensureAuth , UserController.pruebas);
api.post('/register', UserController.saveUser);
api.post('/login', UserController.loginUser);
api.get('/user/:id', md_auth.ensureAuth, UserController.getUser);
api.get('/users/:page?', md_auth.ensureAuth, UserController.getUsers);
api.get('/counters/:id?', md_auth.ensureAuth, UserController.getCounters);
api.put('/update-user/:id', md_auth.ensureAuth, UserController.updateUser);
api.post('/upload-image-user/:id', [md_auth.ensureAuth, mul_upload.single('image')], UserController.uploadImage);
api.get('/get-image-user/:imageFile', UserController.getImageFile);

module.exports = api;


