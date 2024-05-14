import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { ROLE_MODEL, COMPANY_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const RoleSchema = new Schema(
  {
    name: { type: String, require: true },
    permission: [{type: String, default: ""}],
    company: { type: Schema.Types.ObjectId, ref: COMPANY_MODEL }
  },
  {
    minimize: false,
    timestamps: true,
  }
);

RoleSchema.index({ name: 1 });
RoleSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const RoleModel = model(ROLE_MODEL, RoleSchema);

export { RoleModel, RoleSchema };
