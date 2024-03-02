const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
  type: {
    type: String,
    enum: ["user", "instructor","admin"],
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: "type",
    unique: true,
  },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 },
});

module.exports = mongoose.model("Token", tokenSchema);

