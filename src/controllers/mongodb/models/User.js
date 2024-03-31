import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { COMPANY_MODEL, USER_MODEL, USER_REQUEST_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    userName: { type: String, ref: USER_REQUEST_MODEL, require: true },
    password: { type: String },
    name: { type: String, default: "Anonymous" },
    identification: { type: String, default: "CCCD" },
    phone: { type: String, default: "09xxxxxxxx" },
    hometown: { type: String, default: "HCM" },
    company: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: COMPANY_MODEL,
      default: "64d4ae1494f3988559206fd9",
    },
    title: { type: String, default: "Nhân viên" },
    code: { type: String, default: "BGroupxxxx" },
    codeSHB: { type: String },
    codeMAFC: { type: String },
    timeKeeping: { type: Schema.Types.Mixed, default: {} },
    request: { type: Schema.Types.Mixed, default: {} },
    newLead: { type: Schema.Types.Mixed, default: {} },
    role: {
      type: String,
      enum: [
        "root",
        "admin",
        "ADP",
        "head",
        "ASM",
        "supervisor",
        "teamlead",
        "sales",
        "guest",
        "collab",
      ],
      default: "sales",
    },
    type: { type: String, default: null },
    status: { type: String, enum: ["Active", "Locked"], default: "Active" },
    permission: {
      type: Schema.Types.Mixed,
      default: {
        default: true,
        rule: {
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
      },
    },
    note: { type: Schema.Types.Mixed, default: {} },
    refreshToken: { type: String, default: null },
    sipAccount: {
      type: Object,
      default: {
        extension: "",
        password: "",
        server: "",
        context: "",
        callGroup: "",
        callType: "single",
      },
    },
    adminTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    ADPTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    headTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    ASMTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    supervisorTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    teamleadTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

UserSchema.index({ name: 1 });
UserSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const UserModel = model(USER_MODEL, UserSchema);

export { UserModel, UserSchema };
