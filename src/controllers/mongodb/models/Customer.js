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
    creditLimit: { type: Number, default: 0 },
    dpd: { type: Number, default: 0 },
    statusCode: { type: String, default: "Không có trạng thái" },
    statusSale: { type: String, default: "Không có trạng thái" },
    statusBank: { type: String, default: "Không có trạng thái" },
    loan: { type: Number, default: 0 },
    totalLoans: { type: Number, default: 0 },
    disbursementDay: { type: Date },
    loanTerm: { type: Number, default: 0 },
    dueDay: { type: Number, default: 0 },
    collect: { type: Number, default: 0 },
    payMonthly: { type: Number, default: 0 },
    permanentAddress: { type: String, default: "" },
    workAddress: { type: String, default: "" },
    latestPayment: { type: Date },
    numberDelinquencies: { type: Number, default: 0 },
    reference1: { type: String, default: "" },
    reference2: { type: String, default: "" },
    F1Date: { type: Schema.Types.Mixed },
    dateLastF1: { type: Schema.Types.Mixed },
    disburedDate: { type: Schema.Types.Mixed },
    appId: { type: String, default: "" },
    ReqInsurance: { type: String, default: "" },
    disInsurance: { type: String, default: "" },
    DisAmount: { type: String, default: "" },
    tenure: { type: String, default: "" },
    salesCode: { type: String, default: "" },
    customerProvice: { type: String, default: "" },
    emi: { type: String, default: "" },
    rejectedReason: { type: String, default: "" },
    canDetail: { type: String, default: "" },
    receiveAfter: { type: String, default: "" },
    orther: { type: Schema.Types.Mixed, default: {} },
    history: { type: Array, default: [] },
    action: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, default: "New" },
    count: { type: Number, default: 0 },
    campaign: { type: String, default: "none" },
    noteBank: { type: String, default: '' },
    autocallStatus: { type: String, default: 'none' },
    importFile: { type: String },
    pathFile: { type: String, default: "" },
    linkCard: { type: Schema.Types.Mixed, default: {} },
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
  }
);

CustomerSchema.index({ name: 1 });
CustomerSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const CustomerModel = model(CUSTOMER_MODEL, CustomerSchema);

export { CustomerModel, CustomerSchema };
