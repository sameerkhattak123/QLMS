const mongoose = require('mongoose');

const ayahSchema = new mongoose.Schema({
  AyaID: { type: Number, required: true },
  SuraID: { type: Number, required: true },
  AyaNo: { type: Number, required: true },
  ArabicText: { type: String, required: true },
  FatehMuhammadJalandhri: { type: String },
  MehmoodulHassan: { type: String },
  DrMohsinKhan: { type: String },
  MuftiTaqiUsmani: { type: String },
  RakuID: { type: Number, required: true },
  PRakuID: { type: Number },
  ParaID: { type: Number, required: true }
});

const Ayah = mongoose.model('Ayah', ayahSchema);

module.exports = Ayah;
