import express from "express";
import auth from "../../util/authentication/auth.js";
import fs from "fs";
import path from "path";
import { ASTERISK_PATH } from "../../util/config/index.js";
// import call from "../../controllers/ami/index.js";
import {
  AutoCallModel,
  CustomerModel,
} from "../../controllers/mongodb/index.js";
import Bluebird from "bluebird";
import ami from "../../controllers/ami/ami.js";

// const { ami } = call;
const Route = express.Router();
const { verifyToken } = auth;

const actionCampaign = async (req, res) => {
  try {
    const campaignID = req.body.id;
    await AutoCallModel.findByIdAndUpdate(campaignID, {
      status: "Starting",
    });
    const countData = await CustomerModel.count({
      autocallCampaign: campaignID,
    });
    // console.log({ countData });
    let interval;
    const loadCampaign = await AutoCallModel.findById(campaignID); // load Campaign Begin
    let { progress, timeInterval } = loadCampaign;
    // let loadCustomer = await CustomerModel.find({
    //   autocallCampaign: campaignID,
    //   autocallStatus: { $in: ["Pending", "Calling"] },
    // });

    await new Bluebird(async (resolve, reject) => {
      const startCampaignWithConcurrency = async () => {
        let checkAnswer = 0;
        let checkNoanswer = 0;
        checkAnswer = await CustomerModel.count({
          autocallCampaign: campaignID,
          autocallStatus: "ANSWER",
        });
        checkNoanswer = await CustomerModel.count({
          autocallCampaign: campaignID,
          autocallStatus: { $nin: ["ANSWER", "Pending", "Calling"] },
        });
        console.log({ checkAnswer, checkNoanswer });
        const called = checkAnswer + checkNoanswer;
        await AutoCallModel.findByIdAndUpdate(campaignID, {
          called,
          answered: checkAnswer,
          noanswer: checkNoanswer,
          progress: ((called / countData) * 100).toFixed(1),
        });

        if (progress >= 100) {
          console.log(
            `=========***========= Campain Completed at ${new Date()} ==========***========`
          );
          await AutoCallModel.findByIdAndUpdate(campaignID, {
            status: "Finish",
          });
          if (interval) clearInterval(interval);
          resolve();
        }

        const loadCampaign = await AutoCallModel.findById(campaignID);
        if (!loadCampaign) {
          if (interval) clearInterval(interval);
          // if (loadCounts) clearTimeout(loadCounts);
          resolve();
          throw new Error("Campaign not found");
        }

        let { status, timeout, concurrency, context } = loadCampaign;
        console.log({ loadCampaign });
        if (status !== "Starting") {
          console.log(
            `=========***========= Campain Stop at ${new Date()} ==========***========`
          );
          if (interval) clearInterval(interval);

          resolve();
        }
        let options = {};
        options.limit = concurrency;
        options.sort = { updatedAt: 1 };
        timeInterval = loadCampaign?.timeInterval;

        const array = await CustomerModel.find(
          {
            autocallCampaign: campaignID,
            autocallStatus: "Pending",
          },
          null,
          options
        );
        console.log("arrayLength: ", array.length);

        array.map(async (item) => {
          const number = item.phone;
          const customerID = item._id;
          console.log("phone: ", item.phone);
          await CustomerModel.findByIdAndUpdate(customerID, {
            autocallStatus: "Calling",
          });
          // await ami.actionCampaign(
          //   campaignID,
          //   number,
          //   context,
          //   customerID,
          //   timeout
          // );
          const content = `Channel: local/${number}@${context}\nTimeout: ${
            timeout * 1000
          }\nAccount: autocall-${customerID}\nCallerid: ${campaignID}\nPriority: 1\nApplication: Hangup\nasync: true`;
          const writeStream = fs.createWriteStream(
            path.join(ASTERISK_PATH, "outgoing", `${number}.call`)
          );
          writeStream.write(content);
          writeStream.end();
          // console.log("action callResultAutocall - ID: ", customerID);
          await ami.callResultAutocall(number, customerID, timeInterval);
        });
      };
      startCampaignWithConcurrency();
      interval = setInterval(startCampaignWithConcurrency, timeInterval * 1000);
      res.status(200).json({
        success: true,
        message: `Campaign is starting`,
        data: [],
      });
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed initiate call - ${error.message}`,
    });
  }
};

const spamCall = async (req, res) => {
  try {
    const { id } = req.decode;
    const { number } = req.body;
    const context = "from-test";
    const timeout = 30;

    const event = await ami.actionSpam(number, context, timeout);
    res.status(200).json({
      success: true,
      message: `Call initiated successful to ${number}`,
      data: event,
    });

    // await ami.action(
    //   {
    //     action: "originate",
    //     channel: `Local/${number}@${context}`,
    //     account: `autocall-${id}`,
    //     Application: "Hangup",
    //     Timeout: timeout * 1000,
    //     async: "true",
    //     callerid: 1234,
    //   },
    //   (error, event) => {
    //     if (error) {
    //       console.log(error);
    //       res.status(400).json({
    //         success: false,
    //         message: `Failed initiate call - ${error.message}`,
    //       });
    //     } else {
    //       console.log(event);
    //       res.status(200).json({
    //         success: true,
    //         message: `Call initiated successful to ${number}`,
    //         data: event,
    //       });
    //     }
    //   }
    // );
    // ami.on("managerevent", (event) => {
    //   if (
    //     event.event === "DialEnd" &&
    //     // event.destcalleridnum === number &&
    //     // event.dialstatus === 'RINGING'
    //     event.channelstate == 4
    //     // event.destexten == '0333375156'
    //     // event.destaccountcode === `autocall-${id}`
    //   ) {
    //     console.log("Received event:", event);
    //     ami.removeListener("managerevent", (err) => {
    //       console.log(err);
    //     });
    //   }
    //   if (event.event === "OriginateResponse" && event.exten == number) {
    //     console.log("Received event:", event);
    //     ami.removeListener("managerevent", (err) => {
    //       console.log(err);
    //     });
    //   }
    // });
  } catch (error) {
    console.log(`call initial false ${error}`);
    res.status(400).json({
      success: false,
      message: `Failed initiate call - ${error.message}`,
    });
  }
};
Route.post("/spam", verifyToken, spamCall);
Route.post("/campaign/start", verifyToken, actionCampaign);

// export default {
//   actionCampaign,
//   spamCall,
// };
export default Route;
