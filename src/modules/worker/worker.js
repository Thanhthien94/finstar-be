import mysqlInstance from "../../controllers/mysql/index.js";
import Bluebird from "bluebird";

import {
  UserModel,
  CDRModel,
  CustomerModel,
  SipModel,
  TelcoModel,
  BillModel,
} from "../../controllers/mongodb/index.js";
import { exec } from "child_process";
import { DOMAIN } from "../../util/config/index.js";
import { getParamsCDR } from "../cdr/getParams.js";

const updateCDR = async () => {
  try {
    const getTime = JSON.stringify(
      new Date(new Date().getTime() - 60 * 60 * 1000)
    ).slice(1, 20);
    console.log({ getTime });
    const [users] = await Bluebird.all([UserModel.find().lean().exec()]);

    const options = {};
    options.sort = { createdAt: -1 };
    const priceViettel = await BillModel.findOne(
      { type: "priceViettel" },
      null,
      options
    );
    const priceVinaphone = await BillModel.findOne(
      { type: "priceVinaphone" },
      null,
      options
    );
    const priceMobifone = await BillModel.findOne(
      { type: "priceMobifone" },
      null,
      options
    );
    const priceOthers = await BillModel.findOne(
      { type: "priceOthers" },
      null,
      options
    );
    console.log({ priceViettel, priceVinaphone, priceMobifone, priceOthers });
    const telco = await TelcoModel.find().lean().exec();
    const { viettel, vinaphone, mobifone, others } = telco[0];
    const SIPs = await SipModel.find().populate("user").populate("usersTag");
    const listCnum = SIPs.map((item) => item.extension);
    if (!listCnum && !users.toString()) throw new Error("List not exist");

    const lastapp = "Dial";
    const filter = ` WHERE (cnum IN (${listCnum}) OR src IN (${listCnum})) AND lastapp IN ('${lastapp}') AND calldate >= ${JSON.stringify(
      getTime
    )}`;
    console.log({ filter });

    const [results] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, src, did, dcontext, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter}`
      ),
    ]);

    let lastData = [];
    for (const result of results) {
      const dst = result.dst === "tdial" ? result.did : result.dst;
      const checkNumber = dst.slice(0, 3);
      let telco = "";
      let bill = "";
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
          billID = priceViettel?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceViettel?.price || 0) / 60) * 6
              : (Number(priceViettel?.price || 0) / 60) * Number(billsec);
        }
        if (vinaphone.includes(checkNumber)) {
          telco = "vinaphone";
          billID = priceVinaphone?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceVinaphone?.price || 0) / 60) * 6
              : (Number(priceVinaphone?.price || 0) / 60) * Number(billsec);
        }
        if (mobifone.includes(checkNumber)) {
          telco = "mobifone";
          billID = priceMobifone?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceMobifone?.price || 0) / 60) * 6
              : (Number(priceMobifone?.price || 0) / 60) * Number(billsec);
        }
        if (others.includes(checkNumber)) {
          telco = "others";
          billID = priceOthers?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceOthers?.price || 0) / 60) * 6
              : (Number(priceOthers?.price || 0) / 60) * Number(billsec);
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
  } catch (error) {
    console.log(
      new Date(),
      ": ==========*********=========== Update CDR failed ==========*********===========",
      error.message
    );
  }
};

setInterval(updateCDR, 1 * 60 * 1000);

const fetchCDRToDownload = async (req, res) => {
  try {
    const { filter, limit, offset, filterRole } = req.body;

    const users = await UserModel.find(filterRole).lean().exec();
    // fecth CDR start

    const [result] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, cnum, dst, did, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter} ORDER BY cdr.calldate DESC LIMIT ${limit} OFFSET ${offset}`
      ),
    ]);

    let resultMapUser = [];
    for (const item of result) {
      let name = "No Name";
      const itemValidate = {
        ...item,
        billsec:
          item.disposition === "NO ANSWER" && item.billsec > 0
            ? 0
            : item.disposition === "ANSWERED" && item.billsec === 0
            ? 1
            : item.billsec,
        linkRecord: `https://${DOMAIN}/admin/recordings/${String(
          item.recordingfile.split("-")[3]
        ).slice(0, 4)}/${String(item.recordingfile.split("-")[3]).slice(
          4,
          6
        )}/${String(item.recordingfile.split("-")[3]).slice(6, 8)}/${
          item.recordingfile
        }`,
      };
      users.map((user) => {
        if (user.sipAccount.extension === item.cnum) {
          name = user.name;
        }
      });
      resultMapUser.push({ name, ...itemValidate });
    }
    let dataExport = [];
    resultMapUser.map((item) => {
      const dataMap = {
        Tên: item.name,
        "Thời Điểm Thực Hiện Cuộc Gọi": item.calldate,
        "Line Nội Bộ": item.cnum,
        "Gọi Đến Số": item.dst,
        "Thời Lượng": item.duration,
        "Đàm Thoại": item.billsec,
        "Trạng Thái Cuộc Gọi": item.disposition,
      };
      dataExport.push(dataMap);
    });
    res.status(200).send(dataExport);
  } catch (error) {
    res.status(400).json({ success: false, message: "Can not get list" });
  }
};

const migrateCDR = async (req, res) => {
  try {
    console.log("query: ", req.query);
    if (!req.query.fromDate) throw new Error("Please choose from date");
    const { id } = req.decode;
    const infor = await UserModel.findById(id).populate("company");
    if (infor?.company?.statusMigrate)
      throw new Error("have 1 processing, please wait and try again later");
    const [users] = await Bluebird.all([UserModel.find().lean().exec()]);
    const options = {};
    options.sort = { createdAt: -1 };
    const priceViettel = await BillModel.findOne(
      { type: "priceViettel" },
      null,
      options
    );
    const priceVinaphone = await BillModel.findOne(
      { type: "priceVinaphone" },
      null,
      options
    );
    const priceMobifone = await BillModel.findOne(
      { type: "priceMobifone" },
      null,
      options
    );
    const priceOthers = await BillModel.findOne(
      { type: "priceOthers" },
      null,
      options
    );
    console.log({ priceViettel, priceVinaphone, priceMobifone, priceOthers });
    const telco = await TelcoModel.find().lean().exec();
    const { viettel, vinaphone, mobifone, others } = telco[0];
    const SIPs = await SipModel.find().populate("user").populate("usersTag");
    // console.log("SIPs: ", SIPs)
    const listCnum = SIPs.map((item) => item.extension);
    if (!listCnum && !users.toString()) throw new Error("List not exist");
    if (!req.query.cnum) {
      req.query.cnum = listCnum;
    }
    req.query.lastapp = "Dial";
    const { filter } = getParamsCDR(req);
    console.log({ filter });

    const [results] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, src, did, dcontext, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter}`
      ),
    ]);
    let lastData = [];
    for (const result of results) {
      const dst = result.dst === "tdial" ? result.did : result.dst;
      const checkNumber = dst.slice(0, 3);
      let telco = "";
      let bill = "";
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
          billID = priceViettel?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceViettel?.price || 0) / 60) * 6
              : (Number(priceViettel?.price || 0) / 60) * Number(billsec);
        }
        if (vinaphone.includes(checkNumber)) {
          telco = "vinaphone";
          billID = priceVinaphone?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceVinaphone?.price || 0) / 60) * 6
              : (Number(priceVinaphone?.price || 0) / 60) * Number(billsec);
        }
        if (mobifone.includes(checkNumber)) {
          telco = "mobifone";
          billID = priceMobifone?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceMobifone?.price || 0) / 60) * 6
              : (Number(priceMobifone?.price || 0) / 60) * Number(billsec);
        }
        if (others.includes(checkNumber)) {
          telco = "others";
          billID = priceOthers?._id;
          bill =
            Number(billsec) > 0 && Number(billsec) <= 6
              ? (Number(priceOthers?.price || 0) / 60) * 6
              : (Number(priceOthers?.price || 0) / 60) * Number(billsec);
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
    res.status(200).json({
      success: true,
      message: `migarate data cdr successful - ${lastData.length} inserted`,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const getRuleIptables = (req, res) => {
  try {
    const command = `iptables -L -v -n --line-numbers`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).send(`Error: ${stderr}`);
      }
      res.status(200).json({
        success: true,
        message: "get rule successful",
        data: `<pre>${stdout}</pre>`,
      });
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const addBlackList = (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) throw new Error("IP is required");

    const command = `iptables -A BLACKLIST -s ${ip} -j DROP`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).send(`Error: ${stderr}`);
      }
      res.status(200).json({
        success: true,
        message: `IP ${ip} has been blacklisted`,
        data: {},
      });
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const removeRule = (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) throw new Error("IP is required");
    // Lệnh để liệt kê tất cả các quy tắc trong iptables
    const listRulesCmd = "iptables -L -v -n --line-numbers";

    // exec(listRulesCmd, (err, stdout, stderr) => {
    //   if (err) {
    //     console.error(`Error listing iptables rules: ${stderr}`);
    //     return res.status(500).send("Failed to list iptables rules");
    //   }

    //   // Tách các chuỗi thành từng dòng
    //   const lines = stdout.split("\n");
    //   const commands = [];

    //   // Duyệt qua các dòng để tìm các quy tắc chứa IP cần gỡ bỏ
    //   lines.forEach((line) => {
    //     if (line.includes(ip)) {
    //       // Tách chuỗi để lấy số dòng và tên chuỗi
    //       const parts = line.trim().split(/\s+/);
    //       const lineNumber = parts[0];
    //       const chainName = parts[1];

    //       // Tạo lệnh để xóa quy tắc
    //       const deleteRuleCmd = `iptables -D ${chainName} ${lineNumber}`;
    //       commands.push(deleteRuleCmd);
    //     }
    //   });

    //   // Thực hiện các lệnh xóa quy tắc
    //   exec(commands.join(" && "), (err, stdout, stderr) => {
    //     if (err) {
    //       console.error(`Error deleting iptables rules: ${stderr}`);
    //       return res.status(500).send("Failed to delete iptables rules");
    //     }
    //     res.status(200).json({
    //       success: true,
    //       message: `IP ${ip} removed from all iptables rules`,
    //       data: {},
    //     });
    //   });
    // });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  fetchCDRToDownload,
  migrateCDR,
  getRuleIptables,
  addBlackList,
  removeRule,
};
