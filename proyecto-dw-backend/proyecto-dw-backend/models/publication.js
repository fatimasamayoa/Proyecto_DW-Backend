'use strict'

var baseDeDatos = require('baseDeDatos');
var Schema = baseDeDatos.Schema;

var PublicationSchema = Schema({
    text: String,
    file: String,
    created_at: String,
    user: { type: Schema.ObjectId, ref: 'User'}
});

module.exports // PublicationSchema
// Minuscula