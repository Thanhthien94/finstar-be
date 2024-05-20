import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { COMPANY_MODEL, ACCESS_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const AccessibilitySchema = new Schema(
  {
    name: { type: String, require: true },
    descsiption: {type: String, default: ""},
    company: [{ type: Schema.Types.ObjectId, ref: COMPANY_MODEL }],
    isDefault: {type: Boolean, default: false}
  },
  {
    minimize: false,
    timestamps: true,
  }
);

AccessibilitySchema.index({ name: 1 });
AccessibilitySchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const AccessibilityModel = model(ACCESS_MODEL, AccessibilitySchema);

export { AccessibilityModel, AccessibilitySchema };
