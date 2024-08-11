import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { BILL_MODEL, USER_MODEL, COMPANY_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const BillSchema = new Schema(
  {
    name: { type: String, require: true },
    type: {
      type: String,
      require: true,
      enum: [
        "deposit",
        "createViettel",
        "createVinaphone",
        "createMobifone",
        "createOthers",
        "subViettel",
        "subVinaphone",
        "subMobifone",
        "subOthers",
        "priceViettel",
        "priceVinaphone",
        "priceMobifone",
        "priceOthers",
      ],
    },
    price: { type: Number, default: 0 },
    price2: { type: Number, default: 0 },
    price3: { type: Number, default: 0 },
    totalBill: { type: Number, default: 0 },
    totalBill2: { type: Number, default: 0 },
    totalBill3: { type: Number, default: 0 },
    surplus: { type: Number },
    surplus2: { type: Number },
    surplus3: { type: Number },
    user: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    company: { type: Schema.Types.ObjectId, ref: COMPANY_MODEL },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

BillSchema.index({ name: 1 });
BillSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const BillModel = model(BILL_MODEL, BillSchema);

export { BillModel, BillSchema };
