import manager from "asterisk-manager";
import Bluebird from "bluebird";
import { EventEmitter } from "events";
import pkg from "lodash";
import {
  ASTERISK_HOST,
  AMI_PORT,
  AMI_USERNAME,
  AMI_PASSWORD,
  NODE_ENV,
  DOMAIN,
} from "../../util/config/index.js";
import {
  CustomerModel,
  CDRModel,
  UserModel,
  SipModel,
  TelcoModel,
  BillModel,
} from "../mongodb/index.js";
import mysqlInstance from "../mysql/index.js";

const { get, noop } = pkg;

// const ENDPOINT_DETAIL_EVENT = "managerevent";
const DETAIL_EVENT = "managerevent";

class AM extends EventEmitter {
  constructor() {
    super();

    this.ami = new manager(
      AMI_PORT,
      ASTERISK_HOST,
      AMI_USERNAME,
      AMI_PASSWORD,
      true
    );
    this.ami.keepConnected();
    this.ami.setMaxListeners(500);
    // this.init();
    this.ami.on(DETAIL_EVENT, (event) => {
      if (
        event.event === "Hangup" &&
        event.context !== "from-pstn" &&
        event.context !== "from-sip-external"
        // event.destcalleridnum === number &&
        // event.channelstate == 4
        // event.destaccountcode === `autocall-${customerID}`
      ) {
        console.log("event: ", event);
        const cnum = event.channel.split("/")[1].split("-")[0];
        setTimeout(() => {
          updateCDR(
            event.calleridnum,
            cnum,
            event.connectedlinenum,
            event.context,
            event.uniqueid
          );
        }, 5 * 1000);
      }
      if (
        event.event === "Hangup" &&
        // event.destcalleridnum === number &&
        event.cause == "18" &&
        event.channel.split("/")[1].split("-")[0] == event.calleridnum
        // event.destaccountcode === `autocall-${customerID}`
      ) {
        const cnum = event.calleridnum;
        // const dst = event.destcalleridnum
        const dst = event.connectedlinenum;
        const linkedid = event.linkedid;
        // console.log({event, cnum})
        // update(cnum, dst, linkedid)
      }
      if (
        event.event === "Hangup" &&
        // event.destcalleridnum === number &&
        event.cause == "17" &&
        event.channel.split("/")[1].split("-")[0] == event.calleridnum
        // event.destaccountcode === `autocall-${customerID}`
      ) {
        const cnum = event.calleridnum;
        // const dst = event.destcalleridnum
        const dst = event.connectedlinenum;
        const linkedid = event.linkedid;
        // console.log({event, cnum})
        // update(cnum, dst, linkedid)
      }
      if (
        event.event === "Hangup" &&
        // event.destcalleridnum === number &&
        event.cause == "16" &&
        event.channel.split("/")[1].split("-")[0] !== "HUB_OUT"
        // event.destaccountcode === `autocall-${customerID}`
      ) {
        const dst = event.connectedlinenum;
        // const dst = event.destcalleridnum
        const cnum = event.channel.split("/")[1].split("-")[0];
        const linkedid = event.linkedid;
        // console.log({event, cnum})
        // update(cnum, dst, linkedid)
      }
      if (event.event == "DTMFEnd" && event.direction == "Received") {
        console.log("event DTMFEnd: ", event);
      }
      // if(event.appdata == 'outisbusy,' || event.appdata == 'hangupcall' || event.event == 'Hangup')
      //   console.log({event})
    });
  }

  static getInstance() {
    if (!AM.instance) {
      AM.instance = new AM();
    }

    return AM.instance;
  }

  //   getAMI() {
  //     return this.ami;
  //   }

  clickToCall(extension, number) {
    // Send ami action

    let detachEvents = noop;
    return new Bluebird(async (resolve, reject) => {
      const attachEvents = () => {
        this.ami.on(DETAIL_EVENT, eventHandler);
        // return once(() => {
        //   this.ami.removeListener(DETAIL_EVENT, eventHandler);
        // });
      };

      const eventHandler = (event) => {
        if (event.event === "EndpointDetail") {
          console.log("on", event);
          this.ami.action(
            {
              action: "originate",
              channel: `PJSIP/${extension}`,
              context: get(event, "context", "non-context"),
              priority: 1,
              exten: number,
              async: "true",
              callerid: extension,
            },
            (err, data) => {
              detachEvents && detachEvents();
              if (err) {
                return reject(err);
              }

              return resolve(data);
            }
          );
          this.ami.removeListener(DETAIL_EVENT, eventHandler);
        }
      };

      attachEvents();
      try {
        // Trigger action
        console.log("trigger_______trigger-load-context");
        this.ami.action({
          action: "pjsipshowendpoint",
          endpoint: extension,
        });
      } catch (error) {
        console.log(error);
        detachEvents && detachEvents();
        return reject(error);
      }
    })
      .timeout(10000)
      .catch(Bluebird.TimeoutError, () => {
        detachEvents && detachEvents();
        throw new Error("timeout");
      });
  }

  clickToCall2(extension, number, context) {
    // Send ami action

    let detachEvents = noop;
    return new Bluebird(async (resolve, reject) => {
      this.ami.action(
        {
          action: "originate",
          channel: `PJSIP/${extension}`,
          context: context,
          priority: 1,
          exten: number,
          async: "true",
          callerid: extension,
        },
        (err, data) => {
          detachEvents && detachEvents();
          if (err) {
            return reject(err);
          }
          console.log({ data });
          return resolve(data);
        }
      );
      try {
        // Trigger action
        this.ami.action({
          action: "pjsipshowendpoint",
          endpoint: extension,
        }),
          (err, e) => {
            if (err) {
              console.log(err);
            } else {
              console.log("event: ", e);
            }
          };
      } catch (error) {
        console.log(error);
        detachEvents && detachEvents();
        return reject(error);
      }
    })
      .timeout(10000)
      .catch(Bluebird.TimeoutError, () => {
        detachEvents && detachEvents();
        throw new Error("timeout");
      });
  }

  callResultAutocall(number, customerID, timeout) {
    return new Bluebird(async (resolve, reject) => {
      const eventHandler = async (event) => {
        if (
          event.event === "DialEnd" &&
          event.destcalleridnum === number &&
          event.channelstate == 4 &&
          event.destaccountcode === `autocall-${customerID}`
        ) {
          // console.log({ event });
          await CustomerModel.findByIdAndUpdate(customerID, {
            autocallStatus: event.dialstatus,
          });
          this.ami.removeListener(DETAIL_EVENT, eventHandler);
          resolve();
        }
      };
      this.ami.on(DETAIL_EVENT, eventHandler);
    })
      .timeout(timeout)
      .catch(Bluebird.TimeoutError, async () => {
        await CustomerModel.findByIdAndUpdate(customerID, {
          autocallStatus: "Pending",
        });
      });
    // const attachEvents = () => {
    // };

    // attachEvents();
  }

  actionCampaign(campaignID, number, context, customerId, timeout) {
    this.ami.action(
      {
        action: "originate",
        channel: `Local/${number}@${context}`,
        account: `autocall-${customerId}`,
        Application: "Hangup",
        Timeout: Number(timeout) * 1000,
        async: "true",
        callerid: campaignID,
      },
      (error, event) => {
        if (error) {
          console.log(error);
        } else {
          console.log(event);
        }
      }
    );
  }

  actionSpam(number, context, timeout) {
    this.ami.action(
      {
        action: "originate",
        channel: `Local/${number}@${context}`,
        account: `spam-test`,
        // Application: "Hangup",
        Application: "Playback",
        Data: "demo-congrats",
        Timeout: timeout * 1000,
        async: "true",
        callerid: 1234,
      },
      (error, event) => {
        if (error) {
          console.log(error);
          return error;
        } else {
          console.log(event);
          return event;
        }
      }
    );
    ami.on("managerevent", (event) => {
      if (
        event.event === "DialEnd" &&
        // event.destcalleridnum === number &&
        // event.dialstatus === 'RINGING'
        event.channelstate == 4
        // event.destexten == '0333375156'
        // event.destaccountcode === `autocall-${id}`
      ) {
        console.log("Received event:", event);
        this.ami.removeListener("managerevent", (err) => {
          console.log(err);
        });
      }
      if (event.event === "OriginateResponse" && event.exten == number) {
        console.log("Received event:", event);
        this.ami.removeListener("managerevent", (err) => {
          console.log(err);
        });
      }
    });
  }

  reload() {
    this.ami.action(
      {
        action: "Command",
        command: "core reload",
      },
      (err, res) => {
        if (err) {
          console.log(err);
          return err;
        } else {
          console.log(res);
          return res;
        }
      }
    );
  }
}

// const ami = AM.getInstance();
const ami = AM.getInstance();
export default ami;

const checkDuplicate = async () => {
  try {
    if (NODE_ENV !== "prod") return;
    const data = await CDRModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },

      {
        $group: {
          _id: {
            billsec: "$billsec",
            cnum: "$cnum",
            dst: "$dst",
            createdAt: "$createdAt",
          },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 }, // lọc những nhóm có nhiều hơn 1 bản ghi
        },
      },
    ]);
    data.forEach(async (doc) => {
      // giữ lại một bản ghi, xóa các bản ghi khác
      await CDRModel.deleteMany({
        _id: { $in: doc.ids.slice(1) }, // xóa các bản ghi trừ bản đầu tiên
      });
    });
    console.log("data check duplicate length: ", data.length);
  } catch (error) {
    console.log({ error });
  }
};
async function updateCDR(SRC, CNUM, DST, DCONTEXT, UNIQUEID) {
  try {
    if (NODE_ENV !== "prod") return;
    const getTime = JSON.stringify(
      new Date(new Date().getTime() - 60 * 60 * 1000)
    ).slice(1, 20);
    console.log({ getTime });
    const [users] = await Bluebird.all([UserModel.find().lean().exec()]);

    const options = {};
    options.sort = { createdAt: -1 };
    const findPriceInfo = async (cnum, type) => {
      const sip = await SipModel.findOne({ extension: cnum });
      const { company } = sip;
      const price = await BillModel.findOne(
        { type: type, company },
        null,
        options
      );
      console.log("priceInfo: ", price);
      return price;
    };
    // const priceViettel = await BillModel.findOne(
    //   { type: "priceViettel" },
    //   null,
    //   options
    // );
    // const priceVinaphone = await BillModel.findOne(
    //   { type: "priceVinaphone" },
    //   null,
    //   options
    // );
    // const priceMobifone = await BillModel.findOne(
    //   { type: "priceMobifone" },
    //   null,
    //   options
    // );
    // const priceOthers = await BillModel.findOne(
    //   { type: "priceOthers" },
    //   null,
    //   options
    // );
    // console.log({ priceViettel, priceVinaphone, priceMobifone, priceOthers });
    const telco = await TelcoModel.find().lean().exec();
    const { viettel, vinaphone, mobifone, others } = telco[0];
    const SIPs = await SipModel.find().populate("user").populate("usersTag");
    const listCnum = SIPs.map((item) => item.extension);
    if (!listCnum && !users.toString()) throw new Error("List not exist");
    if (!listCnum.includes(CNUM)) return;

    const lastapp = "Dial";
    // const filter = ` WHERE (cnum IN (${listCnum}) OR src IN (${listCnum})) AND lastapp IN ('${lastapp}') AND calldate >= ${JSON.stringify(
    //   getTime
    // )}`;
    const filter = ` WHERE lastapp IN ('${lastapp}') AND src IN ('${SRC}') AND dst IN ('${DST}') AND dcontext IN ('${DCONTEXT}') AND uniqueid IN ('${UNIQUEID}') ORDER BY calldate DESC`;
    console.log({ filter });

    const [results] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, src, did, dcontext, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter}`
      ),
    ]);
    console.log("results: ", results);
    let lastData = [];
    for (const result of results) {
      const dst = result.dst === "tdial" ? result.did : result.dst;
      const checkNumber = dst.slice(0, 3);
      let telco = "";
      let bill = 0;
      let bill2 = 0;
      let bill3 = 0;
      let billID = null;
      const customer = await CustomerModel.findOne({ phone: dst });
      const findUser = SIPs.find(
        (sip) =>
          (sip.extension === result.cnum || sip.extension === result.src) &&
          sip.company
      );
      if (findUser) {
        const user = findUser.user._id;
        const company = findUser.user.company;
        const usersTag = findUser.usersTag?.map((item) => item._id);
        const name = findUser.user.name;
        const disposition = result.disposition;
        const billsec =
          result.disposition === "NO ANSWER" && result.billsec > 0
            ? 0
            : result.disposition === "ANSWERED" && result.billsec === 0
            ? 1
            : result.billsec;

        if (viettel.includes(checkNumber)) {
          telco = "viettel";
          const priceViettel = await findPriceInfo(result.cnum, "priceViettel");
          billID = priceViettel?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceViettel?.price || 0) / 60) * 6
              : (Number(priceViettel?.price || 0) / 60) * Number(billsec);
          bill2 =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceViettel?.price2 || 0) / 60) * 6
              : (Number(priceViettel?.price2 || 0) / 60) * Number(billsec);
          bill3 =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceViettel?.price3 || 0) / 60) * 6
              : (Number(priceViettel?.price3 || 0) / 60) * Number(billsec);
        }
        if (vinaphone.includes(checkNumber)) {
          telco = "vinaphone";
          const priceVinaphone = await findPriceInfo(
            result.cnum,
            "priceVinaphone"
          );
          billID = priceVinaphone?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceVinaphone?.price || 0) / 60) * 6
              : (Number(priceVinaphone?.price || 0) / 60) * Number(billsec);
          bill2 =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceVinaphone?.price2 || 0) / 60) * 6
              : (Number(priceVinaphone?.price2 || 0) / 60) * Number(billsec);
          bill3 =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceVinaphone?.price3 || 0) / 60) * 6
              : (Number(priceVinaphone?.price3 || 0) / 60) * Number(billsec);
        }
        if (mobifone.includes(checkNumber)) {
          telco = "mobifone";
          const priceMobifone = await findPriceInfo(
            result.cnum,
            "priceMobifone"
          );
          billID = priceMobifone?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceMobifone?.price || 0) / 60) * 6
              : (Number(priceMobifone?.price || 0) / 60) * Number(billsec);
          bill2 =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceMobifone?.price2 || 0) / 60) * 6
              : (Number(priceMobifone?.price2 || 0) / 60) * Number(billsec);
          bill3 =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceMobifone?.price3 || 0) / 60) * 6
              : (Number(priceMobifone?.price3 || 0) / 60) * Number(billsec);
        }
        if (others.includes(checkNumber)) {
          telco = "others";
          const priceOthers = await findPriceInfo(result.cnum, "priceOthers");
          billID = priceOthers?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceOthers?.price || 0) / 60) * 6
              : (Number(priceOthers?.price || 0) / 60) * Number(billsec);
          bill2 =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceOthers?.price2 || 0) / 60) * 6
              : (Number(priceOthers?.price2 || 0) / 60) * Number(billsec);
          bill3 =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceOthers?.price3 || 0) / 60) * 6
              : (Number(priceOthers?.price3 || 0) / 60) * Number(billsec);
        }
        const dstName = customer?.name;
        const dstID =
          (customer?.userTag &&
            customer?.userTag.toString() === user.toString()) ||
          (customer?.salesTag &&
            customer?.salesTag.toString() === user.toString()) ||
          (customer?.teamleadTag &&
            customer?.teamleadTag.toString() === user.toString()) ||
          (customer?.supervisorTag &&
            customer?.supervisorTag.toString() === user.toString())
            ? customer?._id
            : null;
        const src = result.src;
        const cnum = result.cnum;
        const cnam = result.cnam;
        const duration = result.duration;

        const lastapp = result.lastapp;
        const linkRecord =
          result.recordingfile && result.lastapp === "Dial"
            ? `https://${DOMAIN}/admin/recordings/${String(
                result.recordingfile.split("-")[3]
              ).slice(0, 4)}/${String(result.recordingfile.split("-")[3]).slice(
                4,
                6
              )}/${String(result.recordingfile.split("-")[3]).slice(6, 8)}/${
                result.recordingfile
              }`
            : "";
        const createdAt = result.calldate;
        const data = {
          user,
          usersTag,
          company,
          name,
          dstName,
          dstID,
          src,
          cnum,
          cnam,
          dst,
          telco,
          duration,
          billsec,
          bill,
          bill2,
          bill3,
          billID,
          disposition,
          lastapp,
          linkRecord,
          createdAt,
        };
        const check = await CDRModel.findOne(data);
        if (!check) {
          lastData.push(data);
        }
      }
    }

    // console.log({ lastData });
    await CDRModel.insertMany(lastData);
    setTimeout(() => {
      checkDuplicate();
    }, 60 * 1000);
  } catch (error) {
    console.log(
      new Date(),
      ": ==========*********=========== Update CDR failed ==========*********===========",
      error.message
    );
  }
}
