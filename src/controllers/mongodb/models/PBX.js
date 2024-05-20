import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { PBX_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const PbxSchema = new Schema(
  {
    name: { type: String, require: true },
    host: {type: String, require: true},
    SipPort: {type: Number, require: true, default: 5060},
    WsPort: {type: Number, require: true, default: 8088},
    db: { type: Schema.Types.Mixed, default: {
      username: '',
      password: '',
      host: '',
    } },
    inbound: [{type: String}],
    outbound: [{type: String}],
    context: [{type: String}],
    detail: { type: Schema.Types.Mixed },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

PbxSchema.index({ name: 1 });
PbxSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const PbxModel = model(PBX_MODEL, PbxSchema);

export { PbxModel, PbxSchema };
