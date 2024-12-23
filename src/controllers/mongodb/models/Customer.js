import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { CUSTOMER_MODEL, USER_MODEL, COMPANY_MODEL, AUTOCALL_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const CustomerSchema = new Schema(
  {
    contracts: { type: String, default: "" },
    name: { type: String, default: "" },
    project: { type: String, default: "" },
    identification: { type: String, default: "" },
    phone: { type: String, default: "" },
    product: { type: String, default: "" },
    customerSource: { type: String, default: "" },
    statusCode: { type: String, default: "Không có trạng thái" },
    statusSale: { type: String, default: "Không có trạng thái" },
    statusBank: { type: String, default: "Không có trạng thái" },
    permanentAddress: { type: String, default: "" },
    workAddress: { type: String, default: "" },
    salesCode: { type: String, default: "" },
    customerProvice: { type: String, default: "" },
    other: { type: Schema.Types.Mixed, default: {} },
    history: { type: Array, default: [] },
    action: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, default: "New" },
    campaign: { type: String, default: "none" },
    autocallStatus: { type: String, default: 'none' },
    importFile: { type: String },
    linkContract: { type: Schema.Types.Mixed, default: {} },
    ADPTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    ASMTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    headTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    supervisorTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    teamleadTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    salesTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    companyTag: { type: Schema.Types.ObjectId, ref: COMPANY_MODEL },
    user: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL,
    },
    autocallCampaign: { type: Schema.Types.ObjectId, ref: AUTOCALL_MODEL },
  },
  {
    minimize: false,
    timestamps: true,
    versionKey: false,
  }
);

CustomerSchema.index({ name: 1 });
CustomerSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const CustomerModel = model(CUSTOMER_MODEL, CustomerSchema);

export { CustomerModel, CustomerSchema };
