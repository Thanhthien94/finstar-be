import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { DASHBOARD_MODEL, COMPANY_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const DashBoardSchema = new Schema(
  {
    name: { type: String, require: true },
    companyTag: { type: Schema.Types.ObjectId, ref: COMPANY_MODEL },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

DashBoardSchema.index({ name: 1 });
DashBoardSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const DashBoardModel = model(DASHBOARD_MODEL, DashBoardSchema);

export { DashBoardModel, DashBoardSchema };
