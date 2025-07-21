import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { SIP_MODEL, COMPANY_MODEL, PBX_MODEL, USER_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const SipSchema = new Schema(
  {
    extension: { type: String, require: true },
    password: {type: String, },
    status: {type: Boolean, default: true },
    company: {type: Schema.Types.ObjectId, ref: COMPANY_MODEL},
    pbx: { type: Schema.Types.ObjectId, ref: PBX_MODEL },
    user: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL,
    },
    usersTag: [{
      type: Schema.Types.ObjectId,
      ref: USER_MODEL,
    }],
  },
  {
    minimize: false,
    timestamps: true,
  }
);

SipSchema.index({ name: 1 });
SipSchema.index({ extension: 1 }); // Index for extension lookup in migrateCDR
SipSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const SipModel = model(SIP_MODEL, SipSchema);

export { SipModel, SipSchema };
