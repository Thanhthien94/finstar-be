import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { COMPANY_MODEL, USER_MODEL, USER_REQUEST_MODEL, ROLE_MODEL, SIP_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    username: { type: String, ref: USER_REQUEST_MODEL, require: true },
    password: { type: String },
    firstname: { type: String, default: "Anonymous" },
    lastname: { type: String, default: "Anonymous" },
    identification: { type: String },
    email: { type: String, },
    phone: { type: String, },
    hometown: { type: String },
    company: {
      type: Schema.Types.ObjectId,
      ref: COMPANY_MODEL,
    },
    title: { type: String, default: "Nhân viên" },
    code: { type: String },
    timeKeeping: [{ type: Schema.Types.Mixed, default: {
      timeStart: '',
      timeEnd: '',
      ip: '',
      coordinates: '',
    } }],
    request: [{ type: Schema.Types.Mixed, default: {} }],
    role: [{ type: Schema.Types.ObjectId, ref: ROLE_MODEL }],
    type: { type: String, default: null },
    status: { type: String, enum: ["Active", "Locked"], default: "Active" },
    note: [{ type: Schema.Types.Mixed, default: {} }],
    refreshToken: { type: String, default: null },
    sipAccount: { type: Schema.Types.ObjectId, ref: SIP_MODEL },
    usersTag: [{ type: Schema.Types.ObjectId, ref: USER_MODEL }],
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
