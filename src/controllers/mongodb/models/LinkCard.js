import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { LINKCARD_MODEL, BANK_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const LinkCardSchema = new Schema(
  {
    name: { type: String, require: true },
    link: { type: String, default: '' },
    status: { type: Boolean, default: true },
    type: { type: String, enum:['code', 'noneCode'], require: true },
    image: { type: Schema.Types.Mixed },
    content: { type: String, default: ''  },
    typeCard: {type: String, default: ''},
    bankId: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: BANK_MODEL,
    },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

LinkCardSchema.index({ name: 1 });
LinkCardSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const LinkCardModel = model(LINKCARD_MODEL, LinkCardSchema);

export { LinkCardModel, LinkCardSchema };
