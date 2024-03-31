import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { USER_REQUEST_MODEL, USER_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const UserRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    userName: {type: String},
    requestConnection: {type: Schema.Types.Mixed, default: {} },
    requestInfo: {type: Schema.Types.Mixed, default: {} },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

UserRequestSchema.index({ name: 1 });
UserRequestSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const UserRequestModel = model(USER_REQUEST_MODEL, UserRequestSchema);

export { UserRequestModel, UserRequestSchema };
