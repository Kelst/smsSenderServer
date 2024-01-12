const mongoose = require('mongoose');

const shablonSchema = new mongoose.Schema({
 text:String,
 creator:{
    type:String,
    default:""
 }
});

const Shablon = mongoose.model('Shablon', shablonSchema);

module.exports = Shablon; 