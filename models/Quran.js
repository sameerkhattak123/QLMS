  const mongoose = require('mongoose');

  // Define the schema for your data
  const quranSchema = new mongoose.Schema({
    AyaID: Number,
    SuraID: Number,
    AyaNo: Number,
    ArabicText: String,
    FatehMuhammadJalandhri: String,
    MehmoodulHassan: String,
    DrMohsinKhan: String,
    MuftiTaqiUsmani: String,
    RakuID: String,
    PRakuID: String,
    ParaID: String,
    ID: String,
    ParahNo: Number,
    SurahNo: String,
    RukuParahNo: Number,
    RukuSurahNo: Number,
    AyatNo: Number,
    Ayat: String,
    AyatNew: String,
    AyatNoAraab: String,
    AyatAndTarjuma: String,
    TarjumaLafziDrFarhatHashmi: String,
    TarjumaLafziFahmulQuran: String,
    TarjumaLafziNazarAhmad: String,
    md5Hash: String, 
  });

  // Create a Mongoose model based on the schema
  const Quran = mongoose.model('Quran', quranSchema);

  module.exports = Quran;
