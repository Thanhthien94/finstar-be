import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import {
  USER_MODEL,
  AUTOCALL_MODEL,
  COMPANY_MODEL
} from "../constant.js";

const Schema = mongoose.Schema;

const AutoCallSchema = new Schema(
  {
    name: { type: String },
    type: { type: String },
    status: { type: String, default: 'New' },
    context: { type: String },
    index: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    timeout: { type: Number, default: 60, min: 60 },
    timeInterval: { type: Number, default: 60, min: 60 },
    concurrency: { type: Number, default: 1, max: 200 },
    timeStart: { type: Date },
    timeEnd: { type: Date },
    answered: { type: Number, default: 0 },
    noanswer: { type: Number, default: 0 },
    called: { type: Number, default: 0 },
    user: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL,
    },
    companyTag: { type: Schema.Types.ObjectId, ref: COMPANY_MODEL },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

AutoCallSchema.index({ name: 1 });
AutoCallSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const AutoCallModel = model(AUTOCALL_MODEL, AutoCallSchema);

export { AutoCallModel, AutoCallSchema };
