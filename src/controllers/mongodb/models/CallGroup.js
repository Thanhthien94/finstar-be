import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { CALLGROUP_MODEL, USER_MODEL, COMPANY_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const CallGroupSchema = new Schema(
  {
    name: { type: String, require: true },
    group: { type: Array, default: [] },
    type: { type: String, default: 'circle' },
    supervisorTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    teamleadTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    salesTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    companyTag: { type: Schema.Types.ObjectId, ref: COMPANY_MODEL },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

CallGroupSchema.index({ name: 1 });
CallGroupSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const CallGroupModel = model(CALLGROUP_MODEL, CallGroupSchema);

export { CallGroupModel, CallGroupSchema };
