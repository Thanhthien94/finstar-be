import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { COMPANY_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const CompanySchema = new Schema(
  {
    name: { type: String, require: true },
    groupAdmin: { type: Schema.Types.Mixed, default: {} },
    groupSupervisor: { type: Schema.Types.Mixed, default: {} },
    groupTeamlead: { type: Schema.Types.Mixed, default: {} },
    groupProject: { type: Schema.Types.Mixed, default: {} },
    info: { type: Schema.Types.Mixed, default: {} },
    image: { type: Schema.Types.Mixed },
    color: { type: String, default: 'green' },
    unitPrice: { type: Schema.Types.Mixed, default: {} },
    rule: { type: Schema.Types.Mixed, default: {
      root: {
        importData: true,
        assignData: true,
        revokeData: true,
        exportData: true,
        exportCDR: true,
        deleteImport: true,
        deleteData: true,
        autocall: true,
        getLinkCard: true,
      },
      admin: {
        importData: true,
        assignData: true,
        revokeData: true,
        exportData: true,
        exportCDR: true,
        deleteImport: true,
        deleteData: true,
        autocall: true,
        getLinkCard: true,
      },
      ADP: {
        importData: false,
        assignData: true,
        revokeData: true,
        exportData: true,
        exportCDR: true,
        deleteImport: false,
        deleteData: true,
        autocall: false,
        getLinkCard: true,
      },
      head: {
        importData: false,
        assignData: true,
        revokeData: true,
        exportData: true,
        exportCDR: true,
        deleteImport: false,
        deleteData: true,
        autocall: false,
        getLinkCard: true,
      },
      ASM: {
        importData: false,
        assignData: true,
        revokeData: true,
        exportData: true,
        exportCDR: true,
        deleteImport: false,
        deleteData: true,
        autocall: false,
        getLinkCard: true,
      },
      supervisor: {
        importData: false,
        assignData: true,
        revokeData: true,
        exportData: true,
        exportCDR: true,
        deleteImport: false,
        deleteData: true,
        autocall: false,
        getLinkCard: true,
      },
      teamlead: {
        importData: false,
        assignData: true,
        revokeData: true,
        exportData: true,
        exportCDR: true,
        deleteImport: false,
        deleteData: false,
        autocall: false,
        getLinkCard: true,
      },
      sales: {
        importData: false,
        assignData: false,
        revokeData: false,
        exportData: false,
        exportCDR: false,
        deleteImport: false,
        deleteData: false,
        autocall: false,
        getLinkCard: true,
      },
    } },
    priceAction: { type: String, default: 'followSec' },
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
