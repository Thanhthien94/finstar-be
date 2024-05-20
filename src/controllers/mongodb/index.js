/* eslint-disable no-undef */
import mongoose from "mongoose";
import isEqual from "lodash";
// import stream from "../../util/logger/Logger.js";
import { MONGO_URL, LOG_LEVEL } from "../../util/config/index.js";
import moment from "../../util/monent/moment.js";
import { CallGroupModel } from "./models/CallGroup.js";
import { ContextModel } from "./models/Context.js";
import { UserModel } from "./models/User.js";
import { TimeGroupModel } from "./models/TimeGroup.js";
import { CustomerModel } from "./models/Customer.js";
import { CompanyModel } from "./models/Company.js";
import { LinkCardModel } from "./models/LinkCard.js"
import { BankModel } from "./models/Bank.js";
import { UserRequestModel } from "./models/UserRequest.js";
import { DashBoardModel } from "./models/DashBoard.js";
import { TaskModel } from "./models/Task.js";
import { CDRModel } from "./models/CDR.js";
import { AutoCallModel } from "./models/AutoCall.js";
import { SipModel } from "./models/SIP.js";
import { PbxModel } from "./models/PBX.js";
import { TelcoModel } from "./models/Telco.js";
import { RoleModel } from "./models/Role.js";
import { BillModel } from "./models/Bill.js";
import { AccessibilityModel } from "./models/Accessibility.js";

// const OPPTIONS = {
//   useNewUrlParser: true,
//   useCreateIndex: true,
//   useUnifiedTopology: true,
//   useFindAndModify: false,
// };

class Mongoose {
  ns = "mongoose";
  static instance;

  constructor() {
    mongoose.Promise = global.Promise;
    mongoose.set("debug", isEqual(LOG_LEVEL, "debug"));
    mongoose.connect(MONGO_URL,{
      connectTimeoutMS: 2400 * 1000,
    });
    mongoose.connection
      .on("open", () =>
        console.log(`${moment.formatTime(Date.now())}: Mongoose connected.`)
      )
      .on("error", (error) => console.error(error))
      .on("reconnected", () =>
        console.log(`${moment.formatTime(Date.now())}: Mongoose reconnected.`)
      )
      .on("disconnected", () =>
        console.log(`${moment.formatTime(Date.now())}: Mongoose disconnected.`)
      );   
  }

  static getInstance() {
    if (!Mongoose.instance) {
      Mongoose.instance = new Mongoose();
    }

    return Mongoose.instance;
  }

  connect() {
    try {
      return new Promise((resolve, reject) => {
        if (isEqual(mongoose.connection.readyState, 1)) {
          return resolve(true);
        } else {
          mongoose.connection
            .on("open", () => {
              return resolve(true);
            })
            .on("error", async (error) => {
              return reject(error);
            });
        }
      });  
    } catch (error) {
      console.log(error)
    }
  }
}

const mongodb = Mongoose.getInstance();
export default mongodb;
export {
  CallGroupModel,
  ContextModel,
  UserModel,
  UserRequestModel,
  CustomerModel,
  TimeGroupModel,
  CompanyModel,
  LinkCardModel,
  BankModel,
  DashBoardModel,
  TaskModel,
  CDRModel,
  AutoCallModel,
  PbxModel,
  TelcoModel,
  RoleModel,
  SipModel,
  BillModel,
  AccessibilityModel,
}
