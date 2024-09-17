import mysqlInstance from "../../controllers/mysql/index.js";
import Bluebird from "bluebird";
import { getParamsCDRMongo, getParamsCDR } from "./getParams.js";
import { getParams } from "../../util/getParams/index.js";
import { UserModel, CDRModel } from "../../controllers/mongodb/index.js";
import { exportExcel } from "../../util/excel/excel.js";
import axios from "axios";
import { WORKER_PORT, WORKER_HOST } from "../../util/config/index.js";
import mongoose from "mongoose";


const fetchCDRMongo = async (req, res) => {
  try {
    const { role, _id } = req.decode;
    const user = await UserModel.findById(_id);
    const filter = {};
    if (!role.includes("root")) filter.company = user?.company;
    // fecth CDR start
    const usersTag = await UserModel.find({usersTag: user._id})
    // console.log('userTags: ', usersTag)
    let Tags = usersTag.map((item)=> {
      return item._id
    })
    Tags.push(user._id)
    // console.log('Tags: ', Tags)
    if (!role.includes("root") && !role.includes("admin") && Tags.length) filter.user = {$in: Tags.map(item => new mongoose.Types.ObjectId(item))};
    const { filters, options } = getParamsCDRMongo(req);
    const total = await CDRModel.count({ $and: [filters, filter] });
    const result = await CDRModel.find(
      { $and: [filters, filter] },
      null,
      options
    ).populate("user", ["name"]);
    const analysBill = await CDRModel.aggregate([
      {
        $match: {
          $and: [{ disposition: "ANSWERED" }, filter, filters], // Lọc các tài liệu có 'disposition' bằng 'ANSWERED'
        },
      },
      {
        $group: {
          _id: "$telco", // Nhóm theo trường 'telco'
          totalBill: {
            $sum: {
              $toDouble: "$bill", // Chuyển đổi giá trị của 'bill' sang kiểu số và tính tổng
            },
          },
          totalBillSec: {
            $sum: {
              $toDouble: "$billsec", // Chuyển đổi giá trị của 'bill' sang kiểu số và tính tổng
            },
          },
        },
      },
      {
        $group: {
          _id: null, // Không nhóm theo trường nào cả
          totalBillSum: {
            $sum: "$totalBill", // Tính tổng của các tổng 'bill' theo nhóm 'telco'
          },
          telcoBills: {
            $push: {
              telco: "$_id",
              totalBill: "$totalBill",
              totalBillSec: "$totalBillSec",
            },
          },
        },
      },
    ]);
    const analysDisposition = await CDRModel.aggregate([
      {
        $match: {
          $and: [filter, filters], // Lọc các tài liệu có 'disposition' bằng 'ANSWERED'
        },
      },
      {
        $group: {
          _id: "$disposition", //
          call: {
            $sum: 1,
          },
        },
      },
      {
        $group: {
          _id: null, // Không nhóm theo trường nào cả
          totalCall: {
            $sum: "$call", // Tính tổng của các tổng 'cuộc gọi' theo nhóm 'disposition'
          },
          dispositions: {
            $push: {
              disposition: "$_id",
              call: "$call",
            },
          },
        },
      },
    ]);
    // console.log('analysDisposition: ', analysDisposition)
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        total,
        count: result?.length,
        page: options?.skip + 1,
        limit: options?.limit,
        analysBill,
        analysDisposition,
        data: result,
      },
    });
  } catch (error) {
    console.log({ error });
    res.status(400).json({ success: false, message: "Can not get list" });
  }
};

const fetchTalkTime = async (req, res) => {
  try {
    const { role, _id } = req.decode;
    const user = await UserModel.findById(_id);
    const filter = {};
    if (!role.includes("root")) filter.company = user?.company;
    // fecth CDR start
    const usersTag = await UserModel.find({usersTag: user._id})
    // console.log('userTags: ', usersTag)
    let Tags = usersTag.map((item)=> {
      return item._id
    })
    Tags.push(user._id)
    // console.log('Tags: ', Tags)
    if (!role.includes("root") && !role.includes("admin") && Tags.length) filter.user = {$in: Tags.map(item => new mongoose.Types.ObjectId(item))};
    // req.query.cnum = { $ne: "" }
    const { filters, options } = getParamsCDRMongo(req);
    console.log('filters: ', filters)
    const analysTalkTime = await CDRModel.aggregate([
      {
        $match: {
          $and: [filter, filters],
        },
      },
      {
        $group: {
          _id: "$user",
          totalTalkTime: {
            $sum: {
              $toDouble: {
                $cond: [{ $eq: ["$disposition", "ANSWERED"] }, "$billsec", 0],
              },
            },
          },
          totalBill: {
            $sum: {
              $toDouble: {
                $cond: [{ $eq: ["$disposition", "ANSWERED"] }, "$bill", 0],
              },
            },
          },
          totalBill2: {
            $sum: {
              $toDouble: {
                $cond: [{ $eq: ["$disposition", "ANSWERED"] }, "$bill2", 0],
              },
            },
          },
          totalBill3: {
            $sum: {
              $toDouble: {
                $cond: [{ $eq: ["$disposition", "ANSWERED"] }, "$bill3", 0],
              },
            },
          },
          totalAnswered: {
            $sum: {
              $cond: [{ $eq: ["$disposition", "ANSWERED"] }, 1, 0],
            },
          },
          totalCall: {
            $sum: 1, // Đếm tổng số document không phụ thuộc vào `disposition`
          },
          cnums: { $addToSet: "$cnum" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          username: "$user.username",
          firstname: "$user.firstname",
          lastname: "$user.lastname",
          totalTalkTime: 1,
          totalBill: 1,
          totalBill2: 1,
          totalBill3: 1,
          totalAnswered: 1,
          totalCall: 1,
          cnums: 1,
        },
      },
    ]);
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        page: options?.skip + 1,
        limit: options?.limit,
        analysTalkTime: analysTalkTime|| [],
      },
    });
  } catch (error) {
    console.log({ error });
    res.status(400).json({ success: false, message: "Can not get list" });
  }
};

const migrateCDR = async (req, res) => {
  try {
    const fromDate = req.query.fromDate;
    const requestConfig = {
      method: "get",
      url: `http://${WORKER_HOST}:${WORKER_PORT}/worker/migrateCDR?fromDate=${fromDate}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    };
    let success = false;
    let message = "";
    let dataError = {};
    await axios(requestConfig)
      .then((res) => {
        success = res.data.success;
        message = res.data.message;
        // console.log('res: ', res)
      })
      .catch((error) => {
        // console.log(error.response.data)
        dataError = error.response.data;
      });
    console.log({ dataError });
    if (Object.keys(dataError).length !== 0) throw new Error(dataError.message);
    if (success)
      res.status(200).json({
        success: true,
        message,
      });
  } catch (error) {
    console.log({ error });
    res.status(400).json({ success: false, message: error.message });
  }
};

const fetchCDRToDownload = async (req, res) => {
  try {
    const rolePermit = req.decode.role;
    const id = req.decode.id;
    const user = await UserModel.findById(id);
    const { filters } = getParams(req);
    let filterPlus = {};
    // const { role } = req.query
    if (rolePermit === "root") filterPlus = filters;
    if (rolePermit === "admin") {
      filterPlus = {
        $and: [filters, { company: user.company }],
      };
    }
    if (rolePermit === "head") {
      filterPlus = {
        $and: [filters, { headTag: id }],
      };
    }
    if (rolePermit === "ASM") {
      filterPlus = {
        $and: [filters, { ASMTag: id }],
      };
    }
    if (rolePermit === "supervisor") {
      filterPlus = {
        $and: [filters, { supervisorTag: id }],
      };
    }
    if (rolePermit === "teamlead") {
      filterPlus = {
        $and: [filters, { teamleadTag: id }],
      };
    }

    let filterRole = {};
    if (rolePermit === "admin") {
      filterRole = {
        company: user.company,
      };
    }
    if (rolePermit === "head") {
      filterRole = {
        headTag: id,
      };
    }
    if (rolePermit === "ASM") {
      filterRole = { ASMTag: id };
    }

    if (rolePermit === "supervisor") {
      filterRole = {
        supervisorTag: id,
      };
    }
    if (rolePermit === "teamlead") {
      filterRole = {
        teamleadTag: id,
      };
    }
    if (rolePermit === "sales") {
      filterRole = {
        salesTag: id,
      };
    }

    let users = [];
    if (rolePermit === "sales") {
      users = await UserModel.findById(id);
    } else {
      users = await UserModel.find(filterPlus).lean().exec();
      // console.log({users})
    }

    let listCnum = "";
    for (const user of users) {
      if (user.sipAccount.extension) {
        if (listCnum.length < 1) {
          listCnum = listCnum + user.sipAccount.extension;
        } else {
          listCnum = listCnum + "," + user.sipAccount.extension;
        }
      }
    }
    // get dst
    if (
      parseInt(req.query.keyword) > 100000000 &&
      req.query.keyword.length === 10
    ) {
      console.log("dst: ", req.query.keyword);
      console.log("parseInt: ", parseInt(req.query.keyword));

      users = await UserModel.find(filterRole).lean().exec();
      if (users.toString()) req.query.dst = req.query.keyword;
      console.log("users: ", users);
    }
    if (!listCnum && !users.toString()) throw new Error("List not exist");
    req.query.cnum = listCnum;

    // fecth CDR start
    let dataExport = [];
    let dataError = {};
    const { filter, limit, offset } = getParamsCDR(req);
    // console.log({ filter });

    // req to worker
    const requestConfig = {
      method: "post",
      url: `http://${WORKER_HOST}:${WORKER_PORT}/worker/cdr/downloadCDR`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: { filter, limit, offset, filterRole },
    };
    await axios(requestConfig)
      .then((res) => {
        // console.log('data res: ', res.data)
        dataExport = res.data;
      })
      .catch((error) => {
        // console.log(error.response.data)
        dataError = error.response.data;
      });
    console.log({ dataError });
    if (Object.keys(dataError).length !== 0) throw new Error(dataError.message);
    const pathFile = await exportExcel(dataExport);
    res.download(pathFile);
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Can not get list: ${error.message}` });
  }
};

const aggregateCDRLatest = async (req, res) => {
  const { role, _id } = req.decode;
    const user = await UserModel.findById(_id);
    const filter = {};
    if (!role.includes("root")) filter.company = user?.company;
    // fecth CDR start
    // req.query.cnum = { $ne: "" }
    const { filters } = getParamsCDRMongo(req);
  try {
    const aggregateQuery = await CDRModel.aggregate([
      {
        $match: {
          $and: [
            {createdAt: {
              $gte: new Date(new Date() - 24 * 60 * 60 * 1000) // Lọc các bản ghi trong 24 giờ gần nhất
            }},
            filter,
            filters
          ]
        }
      },
      {
        $project: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
          hour: { $hour: "$createdAt" },
          disposition: 1
        }
      },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            day: "$day",
            hour: "$hour"
          },
          dispositions: {
            $push: {
              disposition: "$disposition",
              count: 1
            }
          }
        }
      },
      {
        $unwind: "$dispositions"
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
            hour: "$_id.hour",
            disposition: "$dispositions.disposition"
          },
          count: { $sum: "$dispositions.count" }
        }
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
            hour: "$_id.hour"
          },
          counts: {
            $push: {
              disposition: "$_id.disposition",
              count: "$count"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          timestamp: {
            $dateFromParts: {
              'year': '$_id.year',
              'month': '$_id.month',
              'day': '$_id.day',
              'hour': '$_id.hour',
              'minute': 0,
              'second': 0,
              'millisecond': 0
            }
          },
          counts: 1
        }
      },
      {
        $sort: { timestamp: 1 } // Sắp xếp theo mốc giờ
      }
    ]);
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: aggregateQuery
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Can not fetch aggregateCDR - ${error.message}`,
    });
  }
};

const aggregateCDRAmPm = async (req, res) => {
  const rolePermit = req.decode.role;
  const id = req.decode.id;
  const telco = req.query.telco || [
    "Viettel",
    "Vinaphone",
    "Mobifone",
    "Vietnammobile",
  ];
  // console.log({ telco });
  const user = await UserModel.findById(id);
  const { filters } = getParams(req);
  let filterPlus = {};
  try {
    // const { role } = req.query
    if (rolePermit === "root") filterPlus = filters;
    if (rolePermit === "admin") {
      filterPlus = {
        $and: [filters, { company: user.company }],
      };
    }
    if (rolePermit === "head") {
      filterPlus = {
        $and: [filters, { headTag: id }],
      };
    }
    if (rolePermit === "ASM") {
      filterPlus = {
        $and: [filters, { ASMTag: id }],
      };
    }
    if (rolePermit === "supervisor") {
      filterPlus = {
        $and: [filters, { supervisorTag: id }],
      };
    }
    if (rolePermit === "teamlead") {
      filterPlus = {
        $and: [filters, { teamleadTag: id }],
      };
    }
    let users = [];
    if (rolePermit === "sales") {
      users = await UserModel.findById(id).populate("company");
    } else {
      users = await UserModel.find(filterPlus).populate("company");
      // console.log('users: ', users)
    }

    let listCnum = "";
    let usersCnum = [];
    for (const user of users) {
      if (user.sipAccount.extension) {
        const userCnum = {
          cnum: user.sipAccount.extension,
          name: user.name,
          unitPrice: user.company?.unitPrice,
        };
        if (!user.company) console.log("userNotUnitprice: ", user);
        usersCnum.push(userCnum);
        if (listCnum.length < 1) {
          listCnum = listCnum + user.sipAccount.extension;
        } else {
          listCnum = listCnum + "," + user.sipAccount.extension;
        }
      }
    }
    if (!listCnum) throw new Error("List not exist");
    if (!req.query.cnum) {
      req.query.cnum = listCnum;
    }
    req.query.lastapp = "Dial";

    // fetch CDR start
    const { filter } = getParamsCDR(req);

    const viettel = [
      "096",
      "097",
      "098",
      "032",
      "033",
      "034",
      "035",
      "036",
      "037",
      "038",
      "039",
      "086",
    ];
    const vinaphone = ["091", "094", "081", "082", "083", "084", "085", "088"];
    const mobifone = ["090", "093", "089", "070", "076", "077", "078", "079"];
    const vietnammobile = ["092", "056", "058"];

    const [result] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter}`
      ),
    ]);
    // console.log({result})
    let dataTalkTime = {};
    let dataCall = {};

    // caculate time
    const fromDate = req.query.fromDate;
    const startTime = new Date(fromDate);
    const arrayTimes = new Array(24).fill().map((item, index) => {
      return {
        [index]: new Date(startTime).setHours(0, 0, 0) + index * 60 * 60 * 1000,
        parse: new Date(
          new Date(startTime).setHours(0, 0, 0) + index * 60 * 60 * 1000
        ).toISOString(),
      };
    });

    // init data
    arrayTimes.map((time) => {
      dataTalkTime[Object.keys(time)[0]] = 0;
      dataCall[Object.keys(time)[0]] = 0;
    });

    // fillter by time
    for (const time of arrayTimes) {
      const key = Object.keys(time)[0];
      const timeConditionStart = new Date(time[key]);
      const timeConditionEnd = new Date(time[key] + 60 * 60 * 1000);
      // console.log({ key, timeConditionEnd, timeConditionStart });

      for (const item of result) {
        //filter by Telco
        const checkNumber = item.dst.slice(0, 3);
        if (
          (new Date(item.calldate) >= timeConditionStart &&
            new Date(item.calldate) < timeConditionEnd &&
            item.disposition === "ANSWERED" &&
            item.lastapp !== "Dial") ||
          (new Date(item.calldate) >= timeConditionStart &&
            new Date(item.calldate) < timeConditionEnd &&
            item.disposition === "BUSY")
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataCall[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "NO ANSWER"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataCall[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "FAILED"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataCall[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "ANSWERED"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataTalkTime[key] = dataTalkTime[key] + item.billsec;
            dataCall[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataTalkTime[key] = dataTalkTime[key] + item.billsec;
            dataCall[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataTalkTime[key] = dataTalkTime[key] + item.billsec;
            dataCall[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataTalkTime[key] = dataTalkTime[key] + item.billsec;
            dataCall[key] += 1;
          }
        }
      }
    }
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        aggregateTalktime: dataTalkTime,
        aggregateCall: dataCall,
      },
    });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Can not fetch aggregateCDR - ${error.message}`,
    });
  }
};

const aggregateRankedByTimeFrame = async (req, res) => {
  const rolePermit = req.decode.role;
  const id = req.decode.id;
  const telco = req.query.telco || [
    "Viettel",
    "Vinaphone",
    "Mobifone",
    "Vietnammobile",
  ];
  // console.log({ telco });
  const user = await UserModel.findById(id);
  const { filters } = getParams(req);
  let filterPlus = {};
  try {
    // const { role } = req.query
    if (rolePermit === "root") filterPlus = filters;
    if (rolePermit === "admin") {
      filterPlus = {
        $and: [filters, { company: user.company }],
      };
    }
    if (rolePermit === "head") {
      filterPlus = {
        $and: [filters, { headTag: id }],
      };
    }
    if (rolePermit === "ASM") {
      filterPlus = {
        $and: [filters, { ASMTag: id }],
      };
    }
    if (rolePermit === "supervisor") {
      filterPlus = {
        $and: [filters, { supervisorTag: id }],
      };
    }
    if (rolePermit === "teamlead") {
      filterPlus = {
        $and: [filters, { teamleadTag: id }],
      };
    }
    let users = [];
    if (rolePermit === "sales") {
      users = await UserModel.findById(id).populate("company");
    } else {
      users = await UserModel.find(filterPlus).populate("company");
    }

    let listCnum = "";
    let usersCnum = [];
    for (const user of users) {
      if (user.sipAccount.extension) {
        const userCnum = {
          cnum: user.sipAccount.extension,
          name: user.name,
          unitPrice: user.company.unitPrice,
        };
        usersCnum.push(userCnum);
        if (listCnum.length < 1) {
          listCnum = listCnum + user.sipAccount.extension;
        } else {
          listCnum = listCnum + "," + user.sipAccount.extension;
        }
      }
    }
    if (!listCnum) throw new Error("List not exist");
    if (!req.query.cnum) {
      req.query.cnum = listCnum;
    }

    req.query.lastapp = "Dial";

    // fetch CDR start
    const { filter } = getParamsCDR(req);

    const viettel = [
      "096",
      "097",
      "098",
      "032",
      "033",
      "034",
      "035",
      "036",
      "037",
      "038",
      "039",
      "086",
    ];
    const vinaphone = ["091", "094", "081", "082", "083", "084", "085", "088"];
    const mobifone = ["090", "093", "089", "070", "076", "077", "078", "079"];
    const vietnammobile = ["092", "056", "058"];

    const [result] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter}`
      ),
    ]);
    // console.log({result})
    let dataTalkTime = {};
    let dataCall = {};

    // caculate time
    const fromDate = req.query.fromDate;
    const startTime = new Date(fromDate);
    const arrayTimes = new Array(24).fill().map((item, index) => {
      return {
        [index]: new Date(startTime).setHours(0, 0, 0) + index * 60 * 60 * 1000,
        parse: new Date(
          new Date(startTime).setHours(0, 0, 0) + index * 60 * 60 * 1000
        ).toISOString(),
      };
    });

    // init data
    arrayTimes.map((time) => {
      dataTalkTime[Object.keys(time)[0]] = 0;
      dataCall[Object.keys(time)[0]] = 0;
    });

    // @ fillter by time
    for (const time of arrayTimes) {
      const key = Object.keys(time)[0];
      const timeConditionStart = new Date(time[key]);
      const timeConditionEnd = new Date(time[key] + 60 * 60 * 1000);
      // console.log({ key, timeConditionEnd, timeConditionStart });
      let filteredTalktime = {};
      let filteredCalls = {};
      // @ fillter by user

      for (const item of result) {
        // @ filter by Telco
        const checkNumber = item.dst.slice(0, 3);
        if (
          (new Date(item.calldate) >= timeConditionStart &&
            new Date(item.calldate) < timeConditionEnd &&
            item.disposition === "ANSWERED" &&
            item.lastapp !== "Dial") ||
          (new Date(item.calldate) >= timeConditionStart &&
            new Date(item.calldate) < timeConditionEnd &&
            item.disposition === "BUSY")
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataCall[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "NO ANSWER"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataCall[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "FAILED"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataCall[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataCall[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "ANSWERED" &&
          item.lastapp === "Dial"
        ) {
          for (const user of usersCnum) {
            filteredTalktime[user.name] = filteredTalktime[user.name] || 0;
            filteredCalls[user.name] = filteredCalls[user.name] || 0;
            // console.log('user.cnum: ', user.cnum)
            // console.log('item.cnum: ', item.cnum)
            if (
              item.cnum === user.cnum &&
              telco.includes("Viettel") &&
              viettel.includes(checkNumber)
            ) {
              filteredTalktime[user.name] =
                filteredTalktime[user.name] + item.billsec;
              filteredCalls[user.name] += 1;
              // dataCall[key] += 1;
            }
            if (
              item.cnum === user.cnum &&
              telco.includes("Vinaphone") &&
              vinaphone.includes(checkNumber)
            ) {
              filteredTalktime[user.name] =
                filteredTalktime[user.name] + item.billsec;
              filteredCalls[user.name] += 1;
              // dataCall[key] += 1;
            }
            if (
              item.cnum === user.cnum &&
              telco.includes("Mobifone") &&
              mobifone.includes(checkNumber)
            ) {
              filteredTalktime[user.name] =
                filteredTalktime[user.name] + item.billsec;
              filteredCalls[user.name] += 1;
              // dataCall[key] += 1;
            }
            if (
              item.cnum === user.cnum &&
              telco.includes("Vietnammobile") &&
              vietnammobile.includes(checkNumber)
            ) {
              filteredTalktime[user.name] =
                filteredTalktime[user.name] + item.billsec;
              filteredCalls[user.name] += 1;
              // dataCall[key] += 1;
            }
          }
        }
      }
      filteredTalktime = Object.fromEntries(
        Object.entries(filteredTalktime).sort((a, b) => b[1] - a[1])
      );
      filteredCalls = Object.fromEntries(
        Object.entries(filteredCalls).sort((a, b) => b[1] - a[1])
      );
      // console.log({filteredTalktime})
      dataTalkTime[key] = {
        [Object.keys(filteredTalktime)[0]]:
          filteredTalktime[Object.keys(filteredTalktime)[0]],
      };
      dataCall[key] = {
        [Object.keys(filteredCalls)[0]]:
          filteredCalls[Object.keys(filteredCalls)[0]],
      };
    }
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        aggregateTalktime: dataTalkTime,
        aggregateCall: dataCall,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Can not fetch aggregateCDR - ${error.message}`,
    });
  }
};

const fetchTalkTimeToDownload = async (req, res) => {
  const rolePermit = req.decode.role;
  const id = req.decode.id;
  const { filters } = getParams(req);
  let filterPlus = {};
  try {
    // const { role } = req.query
    if (rolePermit === "root" || rolePermit === "admin") filterPlus = filters;
    if (rolePermit === "head") {
      filterPlus = {
        $and: [filters, { headTag: id }],
      };
    }
    if (rolePermit === "ASM") {
      filterPlus = {
        $and: [filters, { ASMTag: id }],
      };
    }
    if (rolePermit === "supervisor") {
      filterPlus = {
        $and: [filters, { supervisorTag: id }],
      };
    }
    if (rolePermit === "teamlead") {
      filterPlus = {
        $and: [filters, { teamleadTag: id }],
      };
    }
    let users = [];
    if (rolePermit === "sales") {
      users = await UserModel.findById(id).populate("company");
    } else {
      users = await UserModel.find(filterPlus).populate("company");
    }

    let listCnum = "";
    let usersCnum = [];
    for (const user of users) {
      if (user.sipAccount.extension) {
        const userCnum = {
          cnum: user.sipAccount.extension,
          name: user.name,
          unitPrice: user.company.unitPrice,
        };
        usersCnum.push(userCnum);
        if (listCnum.length < 1) {
          listCnum = listCnum + user.sipAccount.extension;
        } else {
          listCnum = listCnum + "," + user.sipAccount.extension;
        }
      }
    }
    if (!listCnum) throw new Error("List not exist");
    req.query.cnum = listCnum;

    // fetch CDR start
    const { filter } = getParamsCDR(req);

    const viettel = [
      "096",
      "097",
      "098",
      "032",
      "033",
      "034",
      "035",
      "036",
      "037",
      "038",
      "039",
      "086",
    ];
    const vinaphone = ["091", "094", "081", "082", "083", "084", "085", "088"];
    const mobifone = ["090", "093", "089", "070", "076", "077", "078", "079"];
    const vietnammobile = ["092", "056", "058"];

    const [result] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, cnum, dst, duration, billsec, disposition, recordingfile, cnam FROM cdr${filter}`
      ),
    ]);

    let talktimeResult = [];
    for (const user of usersCnum) {
      //filter by cnum
      let talktime = 0;
      let talktimeViettel = 0;
      let talktimeVinaphone = 0;
      let talktimeMobifone = 0;
      let talktimeVietnammobile = 0;
      let totalBill = 0;
      let billViettel = 0;
      let billVinaphone = 0;
      let billMobifone = 0;
      let billVietnammobile = 0;

      for (const item of result) {
        //filter by Telco
        if (item.cnum === user.cnum && item.disposition === "ANSWERED") {
          const checkNumber = item.dst.slice(0, 3);
          if (viettel.includes(checkNumber)) {
            talktimeViettel += Number(item.billsec);
            talktime += Number(item.billsec);
            billViettel +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.viettel || 0) / 60) * 6
                : (Number(user.unitPrice.viettel || 0) / 60) *
                  Number(item.billsec);
            totalBill +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.viettel || 0) / 60) * 6
                : (Number(user.unitPrice.viettel || 0) / 60) *
                  Number(item.billsec);
          }
          if (vinaphone.includes(checkNumber)) {
            talktimeVinaphone += Number(item.billsec);
            talktime += Number(item.billsec);
            billVinaphone +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.vinaphone || 0) / 60) * 6
                : (Number(user.unitPrice.vinaphone || 0) / 60) *
                  Number(item.billsec);
            totalBill +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.vinaphone || 0) / 60) * 6
                : (Number(user.unitPrice.vinaphone || 0) / 60) *
                  Number(item.billsec);
          }
          if (mobifone.includes(checkNumber)) {
            talktimeMobifone += Number(item.billsec);
            talktime += Number(item.billsec);
            billMobifone +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.mobifone || 0) / 60) * 6
                : (Number(user.unitPrice.mobifone || 0) / 60) *
                  Number(item.billsec);
            totalBill +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.mobifone || 0) / 60) * 6
                : (Number(user.unitPrice.mobifone || 0) / 60) *
                  Number(item.billsec);
          }
          if (vietnammobile.includes(checkNumber)) {
            talktimeVietnammobile += Number(item.billsec);
            talktime += Number(item.billsec);
            billVietnammobile +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.vietnammobile || 0) / 60) * 6
                : (Number(user.unitPrice.vietnammobile || 0) / 60) *
                  Number(item.billsec);
            totalBill +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.vietnammobile || 0) / 60) * 6
                : (Number(user.unitPrice.vietnammobile || 0) / 60) *
                  Number(item.billsec);
          }
        }
      }
      talktimeResult.push({
        cname: user.name,
        cnum: user.cnum,
        talktime,
        talktimeViettel,
        talktimeVinaphone,
        talktimeMobifone,
        talktimeVietnammobile,
        billViettel,
        billVinaphone,
        billMobifone,
        billVietnammobile,
        totalBill,
      });
    }
    let dataExport = [];
    talktimeResult.map((item) => {
      const dataMap = {
        "Từ Ngày": req.query.fromDay,
        "Đến Ngày": req.query.toDay,
        Tên: item.cname,
        "Line Nội Bộ": item.cnum,
        "Talktime Viettel": item.talktimeViettel,
        "Talktime Vinaphone": item.talktimeVinaphone,
        "Talktime Mobifone": item.talktimeMobifone,
        "Talktime Vietnammonile": item.talktimeVietnammobile,
        "Total Talktime": item.talktime,
        "Bill Viettel": item.billViettel,
        "Bill Vinaphone": item.billVinaphone,
        "Bill Mobifone": item.billMobifone,
        "Bill Vietnammobile": item.billVietnammobile,
        "Total Bill": item.totalBill,
      };
      dataExport.push(dataMap);
    });
    const pathFile = await exportExcel(dataExport);
    res.download(pathFile);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
      message: `Can not fetch talk time - ${error.message}`,
    });
  }
};

export default {
  fetchTalkTime,
  fetchTalkTimeToDownload,
  fetchCDRToDownload,
  aggregateCDRAmPm,
  aggregateCDRLatest,
  aggregateRankedByTimeFrame,
  migrateCDR,
  fetchCDRMongo,
};
