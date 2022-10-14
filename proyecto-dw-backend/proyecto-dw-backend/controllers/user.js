'use strict'
let bcrypt = require('bcrypt-nodejs'); //Cargar modelo de encriptación
let baseDeDatosPaginate = require('baseDeDatos-pagination'); //Cargar paginacion de mongoose
let fs = require('fs');
let path = require('path');

let User = require('../models/user'); //Cargar Modelo del user
let Follow = require("../models/follow"); //Cargar model del follow
let Publication = require('../models/publication'); //Cargar modelo de las publicaciones
const { param } = require('../routes/user');
let jwt = require('../services/jwt'); //Cargar modelo del token
const { maxHeaderSize } = require('http');
const user = require('../models/user');


// Métodos de Prueba
function home(req, res)
{
    res.status(200).send({
        message: 'Hola mundo desde el servidor de NodeJs'
    }); 
}

function pruebas(req, res){
    res.status(200).send({
        message: 'Acción de pruebas en el servidor de NodeJs'
    }); 
}

// Registro
function saveUser(req, res){
    let params = req.body;
    let user = new User();
    if(params.name && params.surname && params.nick && params.email && params.password){
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        User.find({$or: [
            {email: user.email.toLowerCase()}, {nick: user.nick.toLowerCase() }
        ]}).exec((err, users)=> {
            if(err) return res.status(500).send({message: 'Error en la petición de usuarios!!'});
            if(users && users.length >= 1){
                return res.status(200).send({message: 'El usuario que intenta registrar ya existe!!'});
            }else{

        // Cifra la paswordd
        bcrypt.hash(params.password, null, null, (err, hash) => {
            user.password = hash;
            user.save((err, userStored) => {
                if(err) return res.status(500).send({message: 'Error al guardar el usuario!!'});
                if(userStored){
                    res.status(200).send({user: userStored});
                }else{
                    res.status(404).send({message: 'No se han registrado el usuario!!'});
                }//end-else
            });
        });
            }//end-else-hash
        });
    }else{
        res.status(200).send({message: 'Es importante llenar todos los campos solicitados'});
    }//end-else
}//end-function


// Login
function loginUser(req, res){
    let params = req.body;
    let email = params.email;
    let password = params.password;

    User.findOne({email: email}, (err, user) => {
        if(err) return res.status(500).send({message: 'Error en la peticion'});
        if(user){
            bcrypt.compare(password, user.password, (err, check) => {
                if(check){
                    //devolver datos de usuario
                    if(params.gettoken){
                        //generar token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });
                    }else{
                        //devolver datos de usuario, esto ayuda a quitar el password al momento de procesarlo.
                        user.password = undefined;
                        return res.status(200).send({user});
                    }
                }else{
                    return res.status(404).send({message: 'El usuario no se ha podido identificar'});
                }
            });
        }else{
            return res.status(404).send({message: 'El usuario no se ha podido identificar!!'});
        }
    });
}//end-function

// Conseguir datos de un usuario
function getUser(req, res){
    let userId = req.params.id;
    User.findById(userId, (err, user) => {
        if(err) return res.status(500).send({
            message: 'Error en la petición'
        });
        if(!user) return res.status(404).send({
            message: 'El usuario no existe'
        });

        followThisUser(req.user.sub, userId).then((value) => {
            user.password = undefined;
            return res.status(200).send({user, 
                following: value.following, 
                followed: value.followed});
        });

        
    });
}//end-function


async function followThisUser(identity_user_id, user_id){
    let following = await Follow.findOne({"user": identity_user_id, "followed":user_id}).exec().then((follow) => {
        return follow;
    }).catch((err) => {
        return handleError(err);
    });

    let followed = await Follow.findOne({"user": identity_user_id, "followed":user_id}).exec().then((follow) => {
        return follow;
    }).catch((err) => {
        return handleError(err);
    });

    return {
        following: following,
        followed: followed
    }
}


// Devolver un listado de usuarios paginado
function getUsers(req, res){
    let identity_user_id = req.user.sub;
    let page = 1;
    if(req.params.page){
        page = req.params.page;
    }
    let itemsPerPage = 5;
    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if(err) res.status(500).send({message: 'Error en la petición'});

        if(!users) return res.status(404).send({message: 'No hay usuarios disponible'});

        followUsersIds(identity_user_id).then((value) =>{
            return res.status(200).send({
                users,
                users_following: value.following,
                users_follow_me: value.followed,
                total,
                pages: Math.ceil(total/itemsPerPage)
            })
        });
    });
}//end-function-listado-usuarios

async function followUsersIds(user_id){

    let following = await Follow.find({"user":user_id}).select({'_id':0,'__v':0, 'user': 0}).exec().then((follows) => {
        return follows;
    }).catch((err) => {
        return handleError(err);
    });

    let followed = await Follow.find({"followed":user_id}).select({'_id':0,'__v':0, 'followed': 0}).exec().then((follows) => {
        return follows;
    }).catch((err) => {
        return handleError(err);
    });

    // Procesar Following ids
    let following_clean = [];
    following.forEach((follow) => {
        following_clean.push(follow.followed);
    });
    
    // Procesar Followed ids
    let followed_clean = [];
    followed.forEach((follow) => {
    followed_clean.push(follow.user);
    });

    return {
        following: following_clean,
        followed: followed_clean
    }

}//end-function-follow


//Edicion de datos de usuario
function updateUser(req, res){
    let userId = req.params.id;
    let update = req.body;
    // Borrar la propiedad password
    delete update.password;
    if(userId != req.user.sub){
        return res.status(500).send({
            message: 'No tienes permiso para actualizar los datos del usuario'
        });
    }

    User.findOne({$or: [
        {email: update.email.toLowerCase()}, {nick: update.nick.toLowerCase() }
    ]}).exec((err, user) => {
        if(user && user._id != userId) return res.status(500).send({message: 'Los datos ya estan en uso'});

        User.findByIdAndUpdate(userId, update, {new:true}, (err, userUpdated) => { //new true: devuelve el objeto actualizado
            if(err) return res.status(500).send({message: 'Error en la peticion'});
            if(!userUpdated) return res.status(404).send({message: 'No se han podido actualizar el usuario!!'});
            return res.status(200).send({user: userUpdated});
        });

        
    });
}//end-function

function getCounters(req, res){
    let userId = req.user.sub;
    if(req.params.id){
        userId = req.params.id;
    }

    getCountFollow(userId).then((value) => {
        return res.status(200).send(value);
    });
}

async function getCountFollow(user_id){
    
    let following = await Follow.countDocuments({"user": user_id}).exec().then((count) => {
        return count;
    }).catch((err) => {return handleError(err)});
    
    
    let followed = await Follow.countDocuments({"followed": user_id}).exec().then((count) => {
        return count;
    }).catch((err) => {return handleError(err)});

    let publications = await Publication.countDocuments({'user': user_id}).exec().then((count) => {
        return count;
    }).catch((err) => {return handleError(err)});

    return {
        following: following,
        followed: followed,
        publication: publications
    }
}//end-function


/// Subir archivos de imagenes/avatar de usuario
function uploadImage(req, res){
    let userId = req.params.id;

    if(req.file){
        let file_path = req.file.path;

        let file_split = file_path.split('\\');

        let file_name = file_split[2];

        let ext_split = req.file.originalname.split('\.');

        let file_ext = ext_split[1];

        if(userId != req.user.sub){
            return RemoveFileOfUploads(res, file_path, 'No tienes permiso para actualizar la data del user!!');
            //return res.status(500).send({message: 'No tienes permiso para actualizar la data del user!!'});
        }

        if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
            // actualizar documento de usuario logeado
            User.findByIdAndUpdate(userId, {image: file_name}, {new:true}, (err, userUpdated) => {
                if(!userUpdated){
                    return res.status(404).send({message: 'No se ha podido actualizar la imagen del usuario'});
                }else{
                    return res.status(200).send({user: userUpdated});
                } 
            });
        }else{
            return RemoveFileOfUploads(res, file_path, 'Extension del archivo no valida');
        }
    }else{
        res.status(200).send({message: 'No has subido ninguna imagen'});
    }

}//end-function

function RemoveFileOfUploads(res, file_path, message){
    fs.unlink(file_path, (err) => {
        return res.status(200).send({message: message});
    });
}//end-funcion

function getImageFile(req, res){
    let image_file = req.params.imageFile;
    let path_file = './upload/users/' + image_file;
    fs.access(path_file, (err) => {
        if(!err){
            res.sendFile(path.resolve(path_file));
        }else{
            res.status(200).send({message: 'No existe la imagen'});
        }
    });
}//end-function




module.exports = { home, pruebas, saveUser, loginUser, getUser, getUsers, getCounters, updateUser, uploadImage, getImageFile }