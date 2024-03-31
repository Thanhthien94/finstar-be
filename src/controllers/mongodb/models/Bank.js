import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { BANK_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const BankSchema = new Schema(
  {
    name: { type: String, require: true },
    content: { type: Schema.Types.Mixed, default: {} },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

BankSchema.index({ name: 1 });
BankSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const BankModel = model(BANK_MODEL, BankSchema);

export { BankModel, BankSchema };
