import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import {
  CUSTOMER_MODEL,
  USER_MODEL,
  CDR_MODEL,
} from "../constant.js";

const Schema = mongoose.Schema;

const CDRSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL,
    },
    name: { type: String },
    dstName: { type: String },
    dstID: { type: Schema.Types.ObjectId, ref: CUSTOMER_MODEL },
    cnum: { type: String },
    cnam: { type: String },
    dst: { type: String },
    duration: { type: String },
    billsec: { type: String },
    disposition: { type: String },
    lastapp: { type: String },
    linkRecord: { type: String },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

CDRSchema.index({ name: 1 });
CDRSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const CDRModel = model(CDR_MODEL, CDRSchema);

export { CDRModel, CDRSchema };
