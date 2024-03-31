import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { CUSTOMER_MODEL, REFERENCE_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const ReferenceSchema = new Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relationship: { type: String, default: 'Bạn' },
    action: { type: Schema.Types.Mixed, default: {} },
    source: { type: String, default: 'Manual' },
    count: { type: Number, default: 0 },
    customerId: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: CUSTOMER_MODEL,
    },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

ReferenceSchema.index({ name: 1 });
ReferenceSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const ReferenceModel = model(REFERENCE_MODEL, ReferenceSchema);

export { ReferenceModel, ReferenceSchema };
