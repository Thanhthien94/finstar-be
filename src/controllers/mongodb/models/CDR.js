import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import {
  CUSTOMER_MODEL,
  USER_MODEL,
  CDR_MODEL,
  COMPANY_MODEL,
  BILL_MODEL,
  SIPLOG_MODEL,
} from "../constant.js";

const Schema = mongoose.Schema;

const CDRSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL,
    },
    usersTag: [{
      type: Schema.Types.ObjectId,
      ref: USER_MODEL,
    }],
    company: {type: Schema.Types.ObjectId, ref: COMPANY_MODEL},
    name: { type: String },
    dstName: { type: String },
    dstID: { type: Schema.Types.ObjectId, ref: CUSTOMER_MODEL },
    src: { type: String },
    cnum: { type: String },
    cnam: { type: String },
    dst: { type: String },
    telco: { type: String },
    duration: { type: String },
    billsec: { type: String },
    bill: { type: Number, default: 0 },
    bill2: { type: Number, default: 0 },
    bill3: { type: Number, default: 0 },
    billID: { type: Schema.Types.ObjectId, ref: BILL_MODEL },
    disposition: { type: String },
    lastapp: { type: String },
    linkRecord: { type: String },
     // Thêm trường mới cho tham chiếu đến SIP logs
     sipLogs: [{ 
      type: Schema.Types.ObjectId, 
      ref: SIPLOG_MODEL 
    }],
    // Thêm trường để lưu trữ chi tiết kỹ thuật
    techDetails: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    minimize: false,
    timestamps: true,
  }
);

CDRSchema.index({ name: 1, disposition: 1, bill: 1, company: 1 });
CDRSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const CDRModel = model(CDR_MODEL, CDRSchema);

export { CDRModel, CDRSchema };
