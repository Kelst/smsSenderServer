const mongoose = require('mongoose');

const smsSchema = new mongoose.Schema({
  datetime: Date,
  type_send: String,
  phone_number: String,
  chat_id: String,
  login: String,
  text_message: String,
  status: String,
  sender_sms: String,
});

const SMS = mongoose.model('SMS', smsSchema);

module.exports = SMS; 