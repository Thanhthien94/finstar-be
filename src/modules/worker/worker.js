import mysqlInstance from "../../controllers/mysql/index.js";
import Bluebird from "bluebird";

import {
  UserModel,
  CDRModel,
  CustomerModel,
  SipModel,
  TelcoModel,
  BillModel,
  companyModel,
} from "../../controllers/mongodb/index.js";
import ami from "../../controllers/ami/ami.js";
import { exec } from "child_process";
import { DOMAIN, NODE_ENV } from "../../util/config/index.js";
import { getParamsCDR } from "../cdr/getParams.js";
import fs from "fs";

const ASTERISK_CONFIG_PATH =
  "/opt/izpbx/data/izpbx/etc/asterisk/extensions_override_freepbx.conf";

  const finstarID = '66472fdae4a52ad5e816e0a0'

const checkDuplicate = async () => {
  try {
    if(NODE_ENV !== "prod") return;
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
    if(data.length > 0) {
      companyModel.findByIdAndUpdate(finstarID, { $push: { note: { checkDuplicate: data, length: data.length, date: new Date()} } })
    }
  } catch (error) {
    console.log({ error });
  }
};
const updateCDR = async () => {
  try {
    if(NODE_ENV !== "prod") return;
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
};

setInterval(checkDuplicate, 60 * 60 * 1000);

// setInterval(updateCDR, 1 * 60 * 1000);

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
    res.status(200).json({
      success: true,
      message: `migarate data cdr successful - ${lastData.length} inserted`,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

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

const getRuleIptables = (req, res) => {
  try {
    const command = `iptables -L BLACKLIST -v -n --line-numbers`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).send(`Error: ${stderr}`);
      }

      // Chuyển đổi stdout thành mảng các dòng và lọc các địa chỉ IP
      const ipList = stdout
        .split("\n") // Tách mỗi dòng thành một phần tử
        .filter((line) => line.includes("DROP")) // Chỉ giữ lại các dòng chứa 'DROP'
        .map((line) => {
          // Sử dụng regex để tìm IP trong dòng
          const match = line.match(/\d+\.\d+\.\d+\.\d+/); // Tìm địa chỉ IP (IPv4)
          return match ? match[0] : null;
        })
        .filter((ip) => ip); // Loại bỏ các giá trị null

      // Trả kết quả là mảng các IP
      res.status(200).json({
        success: true,
        message: "get rule successful",
        data: ipList,
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

    // Lệnh kiểm tra các rule hiện có trong BLACKLIST
    const checkCommand = `iptables -L BLACKLIST -v -n --line-numbers`;

    exec(checkCommand, (checkError, checkStdout, checkStderr) => {
      if (checkError) {
        console.error(`Check exec error: ${checkError}`);
        return res.status(500).send(`Error: ${checkStderr}`);
      }

      // Lọc và tìm xem IP đã tồn tại trong BLACKLIST hay chưa
      const ipExists = checkStdout
        .split("\n") // Tách kết quả ra thành từng dòng
        .filter((line) => line.includes("DROP")) // Chỉ giữ lại các dòng có chứa 'DROP'
        .some((line) => line.includes(ip)); // Kiểm tra xem IP có trong dòng không

      if (ipExists) {
        return res.status(400).json({
          success: false,
          message: `IP ${ip} is already blacklisted`,
        });
      }

      // Nếu IP chưa tồn tại, thêm vào blacklist
      const addCommand = `iptables -A BLACKLIST -s ${ip} -j DROP && iptables-save > /etc/sysconfig/iptables`;
      exec(addCommand, (addError, addStdout, addStderr) => {
        if (addError) {
          console.error(`Add exec error: ${addError}`);
          return res.status(500).send(`Error: ${addStderr}`);
        }

        res.status(200).json({
          success: true,
          message: `IP ${ip} has been blacklisted`,
          data: {},
        });
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

    exec(listRulesCmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error listing iptables rules: ${stderr}`);
        return res.status(500).send("Failed to list iptables rules");
      }

      // Tách các chuỗi thành từng dòng
      const lines = stdout.split("\n");
      const commands = [];

      // Duyệt qua các dòng để tìm các quy tắc chứa IP cần gỡ bỏ
      lines.forEach((line) => {
        if (line.includes(ip)) {
          // Tách chuỗi để lấy số dòng và tên chuỗi
          const parts = line.trim().split(/\s+/);
          const lineNumber = parts[0];
          // const chainName = parts[3];

          // Tạo lệnh để xóa quy tắc
          const deleteRuleCmd = `iptables -D BLACKLIST ${lineNumber}`;
          commands.push(deleteRuleCmd);
        }
      });

      // Kiểm tra nếu không có lệnh nào được tạo
      if (commands.length === 0) {
        return res.status(404).send(`No iptables rules found for IP ${ip}`);
      }

      // Thực hiện các lệnh xóa quy tắc tuần tự
      function executeCommandsSequentially(cmds, index, callback) {
        if (index >= cmds.length) {
          callback();
          return;
        }

        exec(cmds[index], (err) => {
          if (err) {
            return res
              .status(500)
              .send(`Failed to execute command: ${cmds[index]}`);
          }
          executeCommandsSequentially(cmds, index + 1, callback);
        });
      }

      executeCommandsSequentially(commands, 0, () => {
        res.status(200).json({
          success: true,
          message: `IP ${ip} removed from all iptables rules`,
          data: {},
        });
      });
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const removeRuleIptables = (req, res) => {
  const lineNumber = req.body.lineNumber; // Lấy số dòng từ request params
  if (!lineNumber) {
    return res
      .status(400)
      .json({ success: false, message: "Line number is required" });
  }

  try {
    const command = `iptables -D INPUT ${lineNumber}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res
          .status(500)
          .json({ success: false, message: `Error: ${stderr}` });
      }
      res.status(200).json({
        success: true,
        message: `Rule at line ${lineNumber} removed successfully`,
      });
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const restartPBX = (req, res) => {
  try {
    const command = `docker restart izpbx`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return res.status(500).send(`Error: ${stderr}`);
      }
      res.status(200).json({
        success: true,
        message: "PBX Restarted",
      });
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};
const updateRandomList = (req, res) => {
  const { cidList, outboundName } = req.body;
  const reloadAsterik = async () => {
    await ami.reload();
  };
  if (!cidList || !Array.isArray(cidList) || cidList.length === 0) {
    return res.status(400).json({
      message: "CID list không hợp lệ. Vui lòng cung cấp mảng Caller ID.",
    });
  }
  if (!outboundName) {
    return res.status(400).json({
      message: "Tên Outbound không hợp lệ. Vui lòng cung cấp mảng Caller ID.",
    });
  }

  // Đặt tên chuỗi
  const cidName = "CID_LIST_" + outboundName;
  // Chuỗi CID_LIST mới
  const newCidList = cidList.join("|");

  try {
    // Đọc nội dung file
    const fileContent = fs.readFileSync(ASTERISK_CONFIG_PATH, "utf8");

    // Tìm và thay thế CID_LIST trong file
    const updatedContent = fileContent.replace(
      new RegExp(`(${cidName}=)(.*)`),
      `$1${newCidList}`
    );

    // Ghi lại nội dung file sau khi thay đổi
     fs.writeFileSync(ASTERISK_CONFIG_PATH, updatedContent, "utf8");
    reloadAsterik();
    res.status(200).json({
      success: true,
      message: "Cập nhật CID_LIST thành công!",
      data: newCidList,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật CID_LIST:", error);
    res.status(500).json({
      message: "Đã xảy ra lỗi khi cập nhật CID_LIST.",
      error: error.message,
    });
  }
};
const getRandomList = (req, res) => {
  try {
    // Đọc nội dung file
    const fileContent = fs.readFileSync(ASTERISK_CONFIG_PATH, "utf8");

    // Sử dụng regex để tìm tất cả các dòng bắt đầu bằng CID_LIST_
    const matches = [...fileContent.matchAll(/^CID_LIST_\w*=(.*)/gm)];

    if (matches.length > 0) {
      // Tạo object để lưu các danh sách CID_LIST tìm thấy
      const cidLists = matches.reduce((acc, match) => {
        const [fullMatch, cidList] = match;
        const key = fullMatch.split("=")[0].trim(); // Tên của biến CID_LIST
        acc[key] = cidList.trim().split("|"); // Chuyển chuỗi CID_LIST thành mảng
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        message: "Lấy danh sách CID_LIST thành công",
        data: cidLists,
      });
    } else {
      res
        .status(404)
        .json({ message: "Không tìm thấy CID_LIST trong file cấu hình." });
    }
  } catch (error) {
    console.error("Lỗi khi lấy CID_LIST:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: {},
    });
  }
};

function getDirectorySize(path) {
  return new Promise((resolve, reject) => {
    exec(`du -sh ${path}`, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr || error.message}`);
      } else {
        // stdout có dạng "100M    /path/to/directory"
        const size = stdout.split("\t")[0]; // Lấy phần dung lượng
        resolve(size);
      }
    });
  });
}

const getSizePaths = async (req, res) => {
  try {
    const paths = req.body.paths; // Mảng path truyền vào qua body

    if (!Array.isArray(paths)) {
      return res.status(400).json({ error: 'Paths should be an array' });
    }

    const sizes = await Promise.all(paths.map(async (p) => {
      try {
        const size = await getDirectorySize(p);
        return { path: p, size };
      } catch (error) {
        console.log('error', error);
        return { path: p, error: `Unable to get size - ${error.message}`, };
      }
    }));
    res.status(200).json({
      success: true,
      message: "Lấy danh sách dung lượng thành công",
      data: sizes,
    });
  } catch (error) {
    console.error("Lỗi khi lấy size:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: {},
    });
  }
};

export default {
  fetchCDRToDownload,
  migrateCDR,
  getRuleIptables,
  addBlackList,
  removeRule,
  removeRuleIptables,
  restartPBX,
  updateRandomList,
  getRandomList,
  getSizePaths,
};
