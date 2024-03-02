const mongoose = require('mongoose');

const ayahSchema = new mongoose.Schema({
  ID: { type: Number, required: true },
  ParahNo: { type: Number, required: true },
  SurahNo: { type: Number, required: true },
  RukuParahNo: { type: Number, required: true },
  RukuSurahNo: { type: Number, required: true },
  AyatNo: { type: Number, required: true },
  Ayat: { type: String, required: true },
  AyatNew: { type: String },
  AyatNoAraab: { type: String },
  AyatAndTarjuma: { type: String },
  TarjumaLafziDrFarhatHashmi: { type: String },
  TarjumaLafziFahmulQuran: { type: String },
  TarjumaLafziNazarAhmad: { type: String }
});

const QuranSearch = mongoose.model('QuranSearch', ayahSchema); // Change the model name here

module.exports = QuranSearch;
