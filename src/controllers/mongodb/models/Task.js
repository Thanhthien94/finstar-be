import mongoose, { model } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import { CUSTOMER_MODEL, USER_MODEL, COMPANY_MODEL, TASK_MODEL } from "../constant.js";

const Schema = mongoose.Schema;

const TaskSchema = new Schema(
  {
    name: { type: String, default: "" },
    status: { type: String, default: "Pending" },
    flagged: { type: Boolean, default: false },
    content: { type: Schema.Types.Mixed, default: {} },
    reminderTime: { type: Date },
    ADPTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    ASMTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    headTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    supervisorTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    teamleadTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    salesTag: { type: Schema.Types.ObjectId, ref: USER_MODEL },
    companyTag: { type: Schema.Types.ObjectId, ref: COMPANY_MODEL },
    customer: { type: Schema.Types.ObjectId, ref: CUSTOMER_MODEL },
    user: {
      type: Schema.Types.ObjectId,
      ref: USER_MODEL,
    },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

TaskSchema.index({ name: 1 });
TaskSchema.plugin(mongoosePaginate);

// interface UserModel<T extends Document> extends PaginateModel<T> {};
const TaskModel = model(TASK_MODEL, TaskSchema);

export { TaskModel, TaskSchema };
