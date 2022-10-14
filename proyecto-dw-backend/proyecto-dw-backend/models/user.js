'use strict'

var baseDeDatos = require('BaseDeDatos');
var Schema = baseDeDatos.Schema;

var UserSchema = Schema({
    name: String,
    surname: String,
    nick: String,
    email: String,
    password: String,
    role: String,
    image: String
});
//
module.exports // userSchema 
// Minuscula