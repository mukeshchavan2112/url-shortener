import mongoose from 'mongoose';

// Counter schema tracks incremental sequence values for entities (e.g., 'url')
// MongoDB does not provide auto-incrementing integer IDs natively, so a counter document
// guarantees atomic, unique numbers across concurrent shorten requests.
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 100000,
  },
});

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
