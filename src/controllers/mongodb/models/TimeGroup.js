import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { TIMEGROUP_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const TimeGroupSchema = new Schema(
  {
    name: { type: String, require: true },
    monday: { type: Array, default: [] },
    tuesday: { type: Array, default: [] },
    wednesday: { type: Array, default: [] },
    thursday: { type: Array, default: [] },
    friday: { type: Array, default: [] },
    saturday: { type: Array, default: [] },
    sunday: { type: Array, default: [] },
    
  },
  {
    minimize: false,
    timestamps: true,
  }
);

TimeGroupSchema.index({ name: 1 });
TimeGroupSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const TimeGroupModel = model(TIMEGROUP_MODEL, TimeGroupSchema);

export { TimeGroupModel, TIMEGROUP_MODEL };
