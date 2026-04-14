const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      index: true,
    },
    agentEmail: {
      type: String,
    },
    customerName: {
      type: String,
    },
    process: {
      type: String,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
    },
    duration: {
      type: String,
    },
    remarks: {
      type: String,
    },
    audioUrl: {
      type: String,
      default: '',
    },
    audioFilename: {
      type: String,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'audited'],
      default: 'pending',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for date filtering and status
callSchema.index({ date: -1, isActive: 1, status: 1 });

module.exports = mongoose.model('Call', callSchema);
