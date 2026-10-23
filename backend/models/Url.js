import mongoose from 'mongoose';

// Url schema stores shortened URL records
const urlSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  longUrl: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  clicks: {
    type: Number,
    default: 0,
  },
});

const Url = mongoose.model('Url', urlSchema);

export default Url;
