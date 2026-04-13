const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
  {
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call',
      required: true,
    },
    auditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scores: {
      greetingQuality: {
        type: Number,
        min: 1,
        max: 5,
      },
      communicationClarity: {
        type: Number,
        min: 1,
        max: 5,
      },
      complianceAdherence: {
        type: Number,
        min: 1,
        max: 5,
      },
      resolutionQuality: {
        type: Number,
        min: 1,
        max: 5,
      },
      customerSatisfaction: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    remarks: {
      type: String,
    },
    overallScore: {
      type: Number,
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: ['completed', 'pending'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Audit', auditSchema);
