import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { COMPANY_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const CompanySchema = new Schema(
  {
    name: { type: String, require: true },
    info: { type: Schema.Types.Mixed, default: {} },
    image: { type: Schema.Types.Mixed },
    sipPrice: { type: Schema.Types.Mixed },
    color: { type: String, default: 'green' },
    permission: [{type: String, default: ""}],
    countCode: { type: Number, default: 1000 },
    status: { type: String, enum: ['Active', 'Locked'], default: 'Active' },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

CompanySchema.index({ name: 1 });
CompanySchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const CompanyModel = model(COMPANY_MODEL, CompanySchema);

export { CompanyModel, CompanySchema };
