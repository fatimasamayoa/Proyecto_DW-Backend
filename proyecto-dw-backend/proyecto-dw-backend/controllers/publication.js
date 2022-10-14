'use strict'

let path = require('path');
let fs = require('fs');
let moment = require('moment');
let baseDeDatosPaginate = require('baseDeDatos-pagination');

let Publication = require('../models/publication');
let User = require('../models/user');
let Follow = require('../models/follow');
const follow = require('../models/follow');
const publication = require('../models/publication');
const user = require('../models/user');

function test(req, res){
    res.status(200).send({
        message: 'Hola desde el controlador de Publicaciones'
    });
}//end-function

function savePublication(req, res){
    let params = req.body;
    if(!params.text){
        return res.status(200).send({
            message: 'Debes enviar un texto!!'
        });
    }
    let publication = new Publication();
    publication.text = params.text;
    publication.file = 'null';
    publication.user = req.user.sub;
    publication.created_at = moment().unix();

    publication.save((err, publicationStored) => {
        if(err) return res.status(500).send({message: 'Error al guardar la publicacion'});
        if(!publicationStored) return res.status(404).send({message: 'La publicacion no ha sido guardada'});
        return res.status(200).send({publication: publicationStored});
    });

}//end-function

function getPublications(req, res){
    let page = 1;
    if(req.params.page){
        page = req.params.page;
    }
    let itemsPerPage = 4;
    Follow.find({user: req.user.sub}).populate('followed').exec((err, follows) => {
        if(err) return res.status(500).send({message: 'Error al devolver el seguimiento'});
        let follows_clean = [];
        follows.forEach((follow) => {
            follows_clean.push(follow.followed);
        });

    follows_clean.push(req.user.sub);

        Publication.find({user: {"$in":follows_clean}}).sort('-created_at').populate('user').paginate(page, itemsPerPage, (err, publications, total) => {
            if(err) return res.status(500).send({message: 'Error al las publicaciones'});
            if(!publications) return res.status(404).send({message: 'Error al devolver el seguimiento'});
            return res.status(200).send({
                total_items: total,
                pages: Math.ceil(total/itemsPerPage),
                page: page,
                items_per_page : itemsPerPage,
                publications  
            });
        });
    });
}//end-funcion


// Para perfiles

function getPublicationsUser(req, res){
    let page = 1;
    if(req.params.page){
        page = req.params.page;
    }

    var user_id = req.user.sub;
    if(req.params.user){
        user_id = req.params.user;
    }

    let itemsPerPage = 4;
        Publication.find({user: user_id}).sort('-created_at').populate('user').paginate(page, itemsPerPage, (err, publications, total) => {
            if(err) return res.status(500).send({message: 'Error al las publicaciones'});
            if(!publications) return res.status(404).send({message: 'Error al devolver el seguimiento'});
            return res.status(200).send({
                total_items: total,
                pages: Math.ceil(total/itemsPerPage),
                page: page,
                items_per_page : itemsPerPage,
                publications  
            });
        });
    }




function getPublication(req, res){
    let publicationId = req.params.id;
    Publication.findById(publicationId, (err, publication) => {
        if(err) return res.status(500).send({message: 'Error devolver publicaciones'});
        if(!publication) return res.status(404).send({message: 'No existe la publicacion'});
        return res.status(200).send({publication});
    });
}//end-function

function deletePublication(req, res){
    let publicationId = req.params.id;
    Publication.find({'user': req.user.sub, '_id': publicationId}).remove(err => {
        if(err) return res.status(500).send({message: 'Error al eliminar la publicacion'});
        // if(!publicationRemoved) return res.status(404).send({message: 'No existe la publicacion'});
        return res.status(200).send({message: 'Publicacion eliminada correctamente'});
    });
}//end-function


/// Subir archivos de imagenes de la publicacion
function uploadImage(req, res){
    let publicationId = req.params.id;

    if(req.file){
        let file_path = req.file.path;

        let file_split = file_path.split('\\');

        let file_name = file_split[2];

        let ext_split = req.file.originalname.split('\.');

        let file_ext = ext_split[1];

        if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){

            Publication.findOne({'user': req.user.sub, '_id': publicationId}).exec((err, publication) => {
                if(publication){
                    // actualizar documento de la publicacion
                    Publication.findByIdAndUpdate(publicationId, {file: file_name}, {new:true}, (err, publicationUpdated) => {
                        if(err) return res.status(500).send({message: 'Error en la peticion'});
                        if(!publicationUpdated) return res.status(404).send({message: 'No se ha podido actualizar la imagen de la publicacion'});
                        return res.status(200).send({publication: publicationUpdated});
                    });
                }else{
                    return RemoveFileOfUploads(res, file_path, 'No tienes permiso para actualizar la informacion');
                }
            });
        }//end-validation
    
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
    let path_file = './upload/publications/' + image_file;
    fs.access(path_file, (err) => {
        if(!err){
            res.sendFile(path.resolve(path_file));
        }else{
            res.status(200).send({message: 'No existe la imagen'});
        }
    });
}//end-function


module.exports = {
    test, savePublication, getPublications, getPublication, deletePublication, uploadImage, getImageFile, getPublicationsUser
}