import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { TELCO_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const TelcoSchema = new Schema(
  {
    viettel: [{type: String}],
    vinaphone: [{type: String}],
    mobifone: [{type: String}],
    others: [{type: String}],
  },
  {
    minimize: false,
    timestamps: true,
  }
);

TelcoSchema.index({ name: 1 });
TelcoSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const TelcoModel = model(TELCO_MODEL, TelcoSchema);

export { TelcoModel, TelcoSchema };
