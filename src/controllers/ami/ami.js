import manager from "asterisk-manager";
import Bluebird from "bluebird";
import { EventEmitter } from "events";
import pkg from "lodash";
import {
  ASTERISK_HOST,
  AMI_PORT,
  AMI_USERNAME,
  AMI_PASSWORD,
} from "../../util/config/index.js";
import { CustomerModel } from "../mongodb/index.js";

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
    // this.ami.on(DETAIL_EVENT, (event) => {
    //   if (
    //     event.event === "Hangup" &&
    //     // event.destcalleridnum === number &&
    //     event.channelstate == 4
    //     // event.destaccountcode === `autocall-${customerID}`
    //   ) {
    //     const channel = event.channel;
    //     const cnum = channel.split("/")[1].split("-")[0];
    //     // const dst = event.destcalleridnum
    //     const dst = event.connectedlinenum;
    //     const linkedid = event.linkedid;
    //     // console.log({event, cnum})
    //     // update(cnum, dst, linkedid)
    //   }
    //   if (
    //     event.event === "Hangup" &&
    //     // event.destcalleridnum === number &&
    //     event.cause == "18" &&
    //     event.channel.split("/")[1].split("-")[0] == event.calleridnum
    //     // event.destaccountcode === `autocall-${customerID}`
    //   ) {
    //     const cnum = event.calleridnum;
    //     // const dst = event.destcalleridnum
    //     const dst = event.connectedlinenum;
    //     const linkedid = event.linkedid;
    //     // console.log({event, cnum})
    //     // update(cnum, dst, linkedid)
    //   }
    //   if (
    //     event.event === "Hangup" &&
    //     // event.destcalleridnum === number &&
    //     event.cause == "17" &&
    //     event.channel.split("/")[1].split("-")[0] == event.calleridnum
    //     // event.destaccountcode === `autocall-${customerID}`
    //   ) {
    //     const cnum = event.calleridnum;
    //     // const dst = event.destcalleridnum
    //     const dst = event.connectedlinenum;
    //     const linkedid = event.linkedid;
    //     // console.log({event, cnum})
    //     // update(cnum, dst, linkedid)
    //   }
    //   if (
    //     event.event === "Hangup" &&
    //     // event.destcalleridnum === number &&
    //     event.cause == "16" &&
    //     event.channel.split("/")[1].split("-")[0] !== "HUB_OUT"
    //     // event.destaccountcode === `autocall-${customerID}`
    //   ) {
    //     const dst = event.connectedlinenum;
    //     // const dst = event.destcalleridnum
    //     const cnum = event.channel.split("/")[1].split("-")[0];
    //     const linkedid = event.linkedid;
    //     // console.log({event, cnum})
    //     // update(cnum, dst, linkedid)
    //   }
    //   if (event.event == "DTMFEnd" && event.direction == "Received") {
    //     console.log("event DTMFEnd: ", event);
    //   }
    //   // if(event.appdata == 'outisbusy,' || event.appdata == 'hangupcall' || event.event == 'Hangup')
    //   //   console.log({event})
    // });
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
          console.log({data})
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
          resolve()
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
    this.ami.action({
      action: 'Command',
      command: 'core reload',
    }, (err, res)=> {
      if (err) {
        console.log(err)
        return err
      } else {
        console.log(res)
        return res
      }
    })
  }
}

// const ami = AM.getInstance();
const ami = AM.getInstance();
export default ami;
