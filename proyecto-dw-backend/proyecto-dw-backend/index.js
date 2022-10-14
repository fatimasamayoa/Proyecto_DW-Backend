'use strict'

var baseDeDatos = require('base-de-datos'); 
var app = require('./app'); // Incorpora la instancia de express
var port = 3800; // Puerto para ejecutarlo

// Anexar al código
baseDeDatos.set('useFindAndModify', false);

// Conexion a la base de dato
baseDeDatos.Promise = global.Promise;
baseDeDatos.connect('ruta-base-de-datos', {useMongoClient:true}).then(
    () => { console.log("conexion exitosa"),

app.listen(port, () => {console.log("Servidor corriendo en http://localhost:3800");});
}).catch(err => console.log(err)); 
