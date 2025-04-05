// src/controllers/mongodb/models/SIPLog.js
import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { USER_MODEL, COMPANY_MODEL, SIP_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const SipLogSchema = new Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    sourceIp: {
      type: String,
      required: true
    },
    sourcePort: {
      type: Number,
      required: true
    },
    destinationIp: {
      type: String,
      required: true
    },
    destinationPort: {
      type: Number,
      required: true
    },
    callId: {
      type: String,
      required: true,
      index: true
    },
    method: {
      type: String,
      required: true,
      index: true
    },
    fromUser: {
      type: String,
      index: true
    },
    fromDomain: {
      type: String
    },
    toUser: {
      type: String,
      index: true
    },
    toDomain: {
      type: String
    },
    userAgent: {
      type: String
    },
    rawMessage: {
      type: String
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: COMPANY_MODEL
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL
    },
    extension: {
      type: Schema.Types.ObjectId, 
      ref: SIP_MODEL
    },
    cdrId: {
      type: Schema.Types.ObjectId,
      ref: 'CDR'
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '30d' // Tự động xóa log sau 30 ngày
    }
  },
  {
    timestamps: true
  }
);

SipLogSchema.index({ timestamp: -1 });
SipLogSchema.index({ fromUser: 1, toUser: 1 });
SipLogSchema.index({ callId: 1, timestamp: -1 });
SipLogSchema.plugin(mongoosePaginate);

const SipLogModel = model('SipLog', SipLogSchema);

export { SipLogModel, SipLogSchema };