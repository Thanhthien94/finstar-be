import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { CONTEXT_MODEL, TIMEGROUP_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const ContextSchema = new Schema(
  {
    name: { type: String, require: true },
    server: { type: String},
    status: { type: String, enum: ['Active', 'Locked'], default: 'Active' },
    timeGroup: {type: Schema.Types.ObjectId, ref: TIMEGROUP_MODEL},
  },
  {
    minimize: false,
    timestamps: true,
  }
);

ContextSchema.index({ name: 1 });
ContextSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const ContextModel = model(CONTEXT_MODEL, ContextSchema);

export { ContextModel, ContextSchema };
