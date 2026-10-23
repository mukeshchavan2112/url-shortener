import mongoose from 'mongoose';

// Click schema stores individual click events for shortened URLs
const clickSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  ts: {
    type: Date,
    default: Date.now,
  },
  referrer: {
    type: String,
    default: '',
    set: (val) => (typeof val === 'string' ? val.slice(0, 500) : (val ? String(val).slice(0, 500) : '')),
  },
  userAgent: {
    type: String,
    default: '',
    set: (val) => (typeof val === 'string' ? val.slice(0, 500) : (val ? String(val).slice(0, 500) : '')),
  },
});

// Compound index serves both the equality filter on 'code' and descending sort on 'ts' in a single lookup
clickSchema.index({ code: 1, ts: -1 });

// Pre-save hook ensures truncation before saving
clickSchema.pre('save', function (next) {
  if (this.referrer && this.referrer.length > 500) {
    this.referrer = this.referrer.slice(0, 500);
  }
  if (this.userAgent && this.userAgent.length > 500) {
    this.userAgent = this.userAgent.slice(0, 500);
  }
  next();
});

const Click = mongoose.model('Click', clickSchema);

export default Click;
