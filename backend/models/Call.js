const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
    },
    agentName: {
      type: String,
      required: true,
    },
    agentEmail: {
      type: String,
    },
    customerName: {
      type: String,
    },
    process: {
      type: String,
    },
    date: {
      type: Date,
      required: true,
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
      required: true,
    },
    audioFilename: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'audited'],
      default: 'pending',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Call', callSchema);
