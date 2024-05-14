import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { PBX_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const PbxSchema = new Schema(
  {
    extension: { type: Number, require: true },
    password: {type: String, },
    pbx: { type: Schema.Types.ObjectId, ref: PBX_MODEL }
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
