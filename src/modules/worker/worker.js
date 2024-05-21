// import { CustomerModel } from "../../controllers/mongodb/models/Customer.js";
import mysqlInstance from "../../controllers/mysql/index.js";
import Bluebird from "bluebird";
// import { promises as fsPromises } from "fs";
// import zip from 'express-zip'
// import { readExcel, exportExcel } from "../../util/excel/excel.js";
// import { multiFilter } from "../../util/filtersParams/index.js";
import {
  UserModel,
  CDRModel,
  CustomerModel,
  SipModel,
  TelcoModel,
  BillModel,
  // CompanyModel,
  // ReferenceModel,
  // LinkCardModel,
  // BankModel,
  // DashBoardModel,
} from "../../controllers/mongodb/index.js";
// import { getParams } from "../../util/getParams/index.js";
// import { getRule } from "../../util/validation/getRule.js";
// import moment from "../../util/monent/moment.js";
// import os from "os";
import { ASTERISK_HOST, DOMAIN } from "../../util/config/index.js";
import { getParamsCDR } from "../cdr/getParams.js";
import { populate } from "dotenv";
// let fetchCustomers = [];
// setTimeout(async () => {
//   fetchCustomers = await CustomerModel.find().lean().exec();
// }, 1 * 10 * 1000);
// setInterval(async () => {
//   fetchCustomers = await CustomerModel.find().lean().exec();
// }, (5 * 60 + Math.floor(Math.random() * 10)) * 1000);

// const calcDashboardCRM = async (req, res) => {
//   try {
//     const { lastFilters, filterPlus, filterWithProject } = req.body;

//     const listProject = await CustomerModel.distinct("project", filterPlus);
//     const listSupTag = await CustomerModel.distinct(
//       "supervisorTag",
//       filterPlus
//     );
//     const listTeamleadTag = await CustomerModel.distinct(
//       "teamleadTag",
//       filterPlus
//     );
//     const listSalesTag = await CustomerModel.distinct("salesTag", filterPlus);
//     const listBank = await CustomerModel.distinct("linkCard.bank", filterPlus);
//     const listCampaign = await CustomerModel.distinct(
//       "campaign",
//       filterWithProject
//     );
//     const listStatusCode = await CustomerModel.distinct(
//       "statusCode",
//       filterWithProject
//     );
//     const total = await CustomerModel.countDocuments(filterPlus);
//     const results = multiFilter(fetchCustomers, {
//       ...filterPlus,
//       ...lastFilters,
//     });
//     // console.log({results})
//     // const result = await CustomerModel.find(filterPlus)
//     let aggregateProject = {};
//     let aggregateCampaign = {};
//     let aggregateStatusCode = {};
//     let aggregateSupInit = {};
//     let aggregateSup = {};
//     let aggregateTeamleadInit = {};
//     let aggregateTeamlead = {};
//     let aggregateSalesInit = {};
//     let aggregateSales = {};
//     listProject.map((item) => {
//       aggregateProject = { ...aggregateProject, [item]: 0 };
//     });
//     listCampaign.map((item) => {
//       aggregateCampaign = { ...aggregateCampaign, [item]: 0 };
//     });
//     listStatusCode.map((item) => {
//       aggregateStatusCode = { ...aggregateStatusCode, [item]: 0 };
//     });
//     listSupTag.map((item) => {
//       aggregateSupInit = { ...aggregateSupInit, [item]: 0 };
//     });
//     listTeamleadTag.map((item) => {
//       aggregateTeamleadInit = { ...aggregateTeamleadInit, [item]: 0 };
//     });
//     listSalesTag.map((item) => {
//       aggregateSalesInit = { ...aggregateSalesInit, [item]: 0 };
//     });
//     results.map((result) => {
//       listProject.map((item) => {
//         if (result.project === item) {
//           aggregateProject[item] += 1;
//         }
//       });
//       listCampaign.map((item) => {
//         if (result.campaign === item) {
//           aggregateCampaign[item] += 1;
//         }
//       });
//       listStatusCode.map((item) => {
//         if (result.statusCode === item) {
//           aggregateStatusCode[item] += 1;
//         }
//       });
//       if (!result.supervisorTag) {
//         aggregateSupInit[null] += 1;
//         aggregateSup[null] = aggregateSupInit[null] || 0;
//       }
//       if (!result.teamleadTag) {
//         aggregateTeamleadInit[null] += 1;
//         aggregateTeamlead[null] = aggregateTeamleadInit[null] || 0;
//       }
//       if (!result.salesTag) {
//         aggregateSalesInit[null] += 1;
//         aggregateSales[null] = aggregateSalesInit[null] || 0;
//       }
//       listSupTag.map((item) => {
//         if (
//           result.supervisorTag &&
//           item &&
//           result.supervisorTag.toString() === item.toString()
//         ) {
//           aggregateSupInit[item] += 1;
//           aggregateSup[result.supervisorTag] = aggregateSupInit[item];
//         }
//       });
//       listTeamleadTag.map((item) => {
//         if (
//           result.teamleadTag &&
//           item &&
//           result.teamleadTag.toString() === item.toString()
//         ) {
//           aggregateTeamleadInit[item] += 1;
//           aggregateTeamlead[result.teamleadTag] = aggregateTeamleadInit[item];
//         }
//       });
//       listSalesTag.map((item) => {
//         if (
//           result.salesTag &&
//           item &&
//           result.salesTag.toString() === item.toString()
//         ) {
//           aggregateSalesInit[item] += 1;
//           aggregateSales[result.salesTag] = aggregateSalesInit[item];
//         }
//       });
//     });
//     // console.log('entries: ', Object.entries(aggregateSup))
//     aggregateProject = Object.fromEntries(
//       Object.entries(aggregateProject).sort((a, b) => b[1] - a[1])
//     );
//     aggregateCampaign = Object.fromEntries(
//       Object.entries(aggregateCampaign).sort((a, b) => b[1] - a[1])
//     );
//     aggregateStatusCode = Object.fromEntries(
//       Object.entries(aggregateStatusCode).sort((a, b) => b[1] - a[1])
//     );
//     aggregateSup = Object.fromEntries(
//       Object.entries(aggregateSup).sort((a, b) => b[1] - a[1])
//     );
//     aggregateTeamlead = Object.fromEntries(
//       Object.entries(aggregateTeamlead).sort((a, b) => b[1] - a[1])
//     );
//     aggregateSales = Object.fromEntries(
//       Object.entries(aggregateSales).sort((a, b) => b[1] - a[1])
//     );
//     aggregateSup = { null: aggregateSup[null], ...aggregateSup };
//     aggregateTeamlead = { null: aggregateTeamlead[null], ...aggregateTeamlead };
//     aggregateSales = { null: aggregateSales[null], ...aggregateSales };
//     const data = {
//       total,
//       count: results.length,
//       listProject,
//       listBank,
//       listCampaign,
//       listStatusCode,
//       data: {
//         aggregateProject,
//         aggregateCampaign,
//         aggregateStatusCode,
//         aggregateSup,
//         aggregateTeamlead,
//         aggregateSales,
//       },
//     };
//     // console.log({data})
//     res
//       .status(200)
//       .json({ success: true, message: "get dashboard successful", data });
//   } catch (error) {
//     console.log("ERROR", error);
//     res.status(400).json({ success: false, message: error.message });
//     // next(error);
//   }
// };


const updateCDR = async () => {
  try {
    const getTime = JSON.stringify(
      new Date(new Date().getTime() + 7 * 60 * 60 * 1000 - 60 * 60 * 1000)
    ).slice(1, 20);
    console.log({ getTime });
    // const users = await UserModel.find().lean().exec();
    // const customers = await CustomerModel.find().lean().exec();
    const [users] = await Bluebird.all([
      UserModel.find().lean().exec(),
      // CustomerModel.find().lean().exec()
    ]);
    // console.log({ users });

    // let listCnum = "";
    // for (const user of users) {
    //   if (user.sipAccount.extension) {
    //     if (listCnum.length < 1) {
    //       listCnum = listCnum + user.sipAccount.extension;
    //     } else {
    //       listCnum = listCnum + "," + user.sipAccount.extension;
    //     }
    //   }
    // }
    const options = {}
    options.sort = { createdAt: -1 }
    const priceViettel = await BillModel.find({type: 'priceViettel'},null, options)
    const priceVinaphone = await BillModel.find({type: 'priceVinaphone'},null, options)
    const priceMobifone = await BillModel.find({ type: 'priceMobifone'},null, options)
    const priceOthers = await BillModel.find({type: 'priceOthers'},null, options)
    const telco = await TelcoModel.find().lean().exec();
    const {viettel, vinaphone, mobifone, others} = telco[0]
    const SIPs = await SipModel.find().populate("user").populate("usersTag")
    const listCnum = SIPs.map(item => item.extension)
    if (!listCnum && !users.toString()) throw new Error("List not exist");
    // if (!req.query.cnum) {
    //   req.query.cnum = listCnum;
    // }
    
    // fecth CDR start
    // const newDate = new Date();
    // const fromDate = new Date(new Date().getTime() - 4 * 24 * 60 * 60 * 1000);
    // req.query.fromDate = fromDate;
    const lastapp = "Dial";
    const filter  = ` WHERE (cnum IN (${listCnum}) OR src IN (${listCnum})) AND lastapp IN ('${lastapp}') AND calldate >= ${JSON.stringify(getTime)}`
    console.log({ filter });

    const [results] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, src, dcontext, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter}`
      ),
    ]);
    console.log({ results });
    // let resultMapUser = [];
    let lastData = [];
    // if (results)
    // (results) &&
    for (const result of results) {
      const dst = result.dst;
      const checkNumber = result.dst.slice(0, 3)
      let telco = "";
      let bill = ""
      const customer = await CustomerModel.findOne({ phone: dst });
      const user = SIPs.find(
        (sip) => sip.extension === result.cnum || sip.extension === result.src
      ).user?._id;
      const usersTag = SIPs.find(
        (sip) => sip.extension === result.cnum || sip.extension === result.src
      ).usersTag?.map(item => item._id);
      const name = SIPs.find(
        (sip) => sip.extension === result.cnum || sip.extension === result.src
      ).user?.name;
      if(viettel.includes(checkNumber)) {
        telco = 'viettel'
        bill = Number(result.billsec) * Number(priceViettel)
      }
      if(vinaphone.includes(checkNumber)) {
        telco = 'vinaphone'
        bill = Number(result.billsec) * Number(priceVinaphone)
      }
      if(mobifone.includes(checkNumber)) {
        telco = 'mobifone'
        bill = Number(result.billsec) * Number(priceMobifone)
      }
      if(others.includes(checkNumber)) {
        telco = 'others'
        bill = Number(result.billsec) * Number(priceOthers)
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
      const src = result.src
      const cnum = result.cnum;
      const cnam = result.cnam;
      const duration = result.duration;
      const billsec =
        result.disposition === "NO ANSWER" && result.billsec > 0
          ? 0
          : result.disposition === "ANSWERED" && result.billsec === 0
          ? 1
          : result.billsec;
      const disposition = result.disposition;
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
        name,
        dstName,
        dstID,
        cnum,
        src,
        cnam,
        dst,
        telco,
        duration,
        billsec,
        bill,
        disposition,
        lastapp,
        linkRecord,
        createdAt,
      };
      const check = await CDRModel.findOne(data);

      // console.log({check})

      // if (!check.length) {

      if (!check) {
        // await CDRModel.create(data);

        lastData.push(data);
      }
    }

    console.log({ lastData });
    await CDRModel.insertMany(lastData);
  } catch (error) {
    console.log(new Date(),': ==========*********=========== Update CDR failed ==========*********===========',error.message);
  }
};

setInterval(updateCDR, 1 * 60 * 1000)

const fetchCDRToDownload = async (req, res) => {
  try {
    const { filter, limit, offset, filterRole } = req.body;

    const users = await UserModel.find(filterRole).lean().exec();
    // fecth CDR start

    const [result] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter} ORDER BY cdr.calldate DESC LIMIT ${limit} OFFSET ${offset}`
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
    // const users = await UserModel.find().lean().exec();
    // const customers = await CustomerModel.find().lean().exec();
    console.log('query: ', req.query)
    if(!req.query.fromDate) throw new Error('Please choose from date')
      const { id } = req.decode
    const infor = await UserModel.findById(id).populate('company')
    if(infor?.company?.statusMigrate) throw new Error('have 1 processing, please wait and try again later')
      const [users] = await Bluebird.all([
    UserModel.find().lean().exec(),
    // CustomerModel.find().lean().exec()
  ]);
  // console.log({ users });
  
  // let listCnum = "";
  // for (const user of users) {
  //   if (user.sipAccount.extension) {
  //     if (listCnum.length < 1) {
  //       listCnum = listCnum + user.sipAccount.extension;
  //     } else {
  //       listCnum = listCnum + "," + user.sipAccount.extension;
  //     }
  //   }
  // }
  const options = {}
    options.sort = { createdAt: -1 }
    const priceViettel = await BillModel.findOne({type: 'priceViettel'},null, options)
    const priceVinaphone = await BillModel.findOne({type: 'priceVinaphone'},null, options)
    const priceMobifone = await BillModel.findOne({ type: 'priceMobifone'},null, options)
    const priceOthers = await BillModel.findOne({type: 'priceOthers'},null, options)
  const telco = await TelcoModel.find().lean().exec();
    const {viettel, vinaphone, mobifone, others} = telco[0]
  const SIPs = await SipModel.find().populate("user").populate("usersTag")
  console.log("SIPs: ", SIPs)
    const listCnum = SIPs.map(item => item.extension)
    if (!listCnum && !users.toString()) throw new Error("List not exist");
  if (!req.query.cnum) {
    req.query.cnum = listCnum;
  }
  req.query.lastapp = "Dial";
  
  // fecth CDR start
  // const newDate = new Date();
  // const fromDate = new Date(new Date().getTime() - 4 * 24 * 60 * 60 * 1000);
  // req.query.fromDate = fromDate;
  const { filter } = getParamsCDR(req);
  console.log({ filter });

    const [results] = await Bluebird.all([
      mysqlInstance.execQuery(
        `SELECT calldate, src, dcontext, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter}`
      ),
    ]);
    console.log({ results });
    console.log('length: ', results.length)
    // let resultMapUser = [];
    let lastData = [];
    // if (results)
    // (results) &&
    for (const result of results) {
      const dst = result.dst;
      const checkNumber = result.dst.slice(0, 3)
      let telco = "";
      let bill = ""
      const customer = await CustomerModel.findOne({ phone: dst });
      const user = SIPs.find(
        (sip) => sip.extension === result.cnum || sip.extension === result.src
      ).user?._id;
      const usersTag = SIPs.find(
        (sip) => sip.extension === result.cnum || sip.extension === result.src
      ).usersTag?.map(item => item._id);
      const name = SIPs.find(
        (sip) => sip.extension === result.cnum || sip.extension === result.src
      ).user?.name;
      if(viettel.includes(checkNumber)) {
        telco = 'viettel'
        bill = Number(result.billsec) <= 6
                ? (Number(priceViettel?.price || 0) / 60) * 6
                : (Number(priceViettel?.price || 0) / 60) * Number(result.billsec);
      }
      if(vinaphone.includes(checkNumber)) {
        telco = 'vinaphone'
        bill = Number(result.billsec) <= 6
                ? (Number(priceVinaphone?.price || 0) / 60) * 6
                : (Number(priceVinaphone?.price || 0) / 60) * Number(result.billsec);
      }
      if(mobifone.includes(checkNumber)) {
        telco = 'mobifone'
        bill = Number(result.billsec) <= 6
                ? (Number(priceMobifone?.price || 0) / 60) * 6
                : (Number(priceMobifone?.price || 0) / 60) * Number(result.billsec);
      }
      if(others.includes(checkNumber)) {
        telco = 'others'
        bill = Number(result.billsec) <= 6
                ? (Number(priceOthers?.price || 0) / 60) * 6
                : (Number(priceOthers?.price || 0) / 60) * Number(result.billsec);
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
      const src = result.src
      const cnum = result.cnum;
      const cnam = result.cnam;
      const duration = result.duration;
      const billsec =
        result.disposition === "NO ANSWER" && result.billsec > 0
          ? 0
          : result.disposition === "ANSWERED" && result.billsec === 0
          ? 1
          : result.billsec;
      const disposition = result.disposition;
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
        disposition,
        lastapp,
        linkRecord,
        createdAt,
      };
      const check = await CDRModel.findOne(data);

      // console.log({check})

      // if (!check.length) {

      if (!check) {
        // await CDRModel.create(data);

        lastData.push(data);
      }
    }

    console.log({ lastData });
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

// const calcPerformanceSup = async (req, res) => {
//   try {
//     const {filters, filterPlus, lastFilter, arrayTimes} = req.body
//     const listSupTag = await CustomerModel.distinct("supervisorTag", {
//       ...filterPlus,
//       ...filters,
//     });
//     const total = await CustomerModel.countDocuments(filterPlus);
//     const results = multiFilter(fetchCustomers, { ...filterPlus, ...lastFilter });
//     // console.log({results})
//     // const result = await CustomerModel.find(filterPlus)
//     let performanceSup = {};
//     for (const result of results) {
//       for (const item of listSupTag) {
//         if (
//           item &&
//           result.supervisorTag &&
//           result.supervisorTag.toString() === item.toString()
//         ) {
//           for (const time of arrayTimes) {
//             if (
//               new Date(result.createdAt) >=
//                 new Date(time[Object.keys(time)[0]]) &&
//               new Date(result.createdAt) <
//                 new Date(time[Object.keys(time)[0]] + 60 * 60 * 1000)
//             ) {
//               const prop = Object.keys(time)[0].toString();
//               performanceSup[item.toString()] = {
//                 ...performanceSup[item.toString()],
//                 [prop]:
//                   performanceSup &&
//                   performanceSup[item.toString()] &&
//                   performanceSup[item.toString()][prop]
//                     ? performanceSup[item.toString()][prop] + 1
//                     : 1,
//               };
//             } else {
//               const prop = Object.keys(time)[0].toString();
//               performanceSup[item.toString()] = {
//                 ...performanceSup[item.toString()],
//                 [prop]:
//                   performanceSup &&
//                   performanceSup[item.toString()] &&
//                   performanceSup[item.toString()][prop]
//                     ? performanceSup[item.toString()][prop]
//                     : 0,
//               };
//             }
//           }
//         }
//       }
//     }
//     const data = {
//       total,
//       count: results.length,
//       listSupTag,
//       data: {
//         performanceSup,
//       },
//     };
//     res
//       .status(200)
//       .json({ success: true, message: "get dashboard successful", data });
//   } catch (error) {
//     console.log("ERROR", error);
//     res.status(400).json({ success: false, message: error.message });
//   }
// };
// const calcPerformanceTeam = async (req, res) => {
//   try {
//     const {filters, filterPlus, lastFilter, arrayTimes} = req.body
//     const listTeamleadTag = await CustomerModel.distinct("teamleadTag", {
//       ...filterPlus,
//       ...filters,
//     });
//     const total = await CustomerModel.countDocuments(filterPlus);
//     const results = multiFilter(fetchCustomers, { ...filterPlus, ...lastFilter });
//     // console.log({results})
//     // const result = await CustomerModel.find(filterPlus)
//     let performanceTeam = {};
//     for (const result of results) {
//       for (const item of listTeamleadTag) {
//         if (
//           item &&
//           result.teamleadTag &&
//           result.teamleadTag.toString() === item.toString()
//         ) {
//           for (const time of arrayTimes) {
//             if (
//               new Date(result.createdAt) >=
//                 new Date(time[Object.keys(time)[0]]) &&
//               new Date(result.createdAt) <
//                 new Date(time[Object.keys(time)[0]] + 60 * 60 * 1000)
//             ) {
//               const prop = Object.keys(time)[0].toString();
//               performanceTeam[item.toString()] = {
//                 ...performanceTeam[item.toString()],
//                 [prop]:
//                   performanceTeam &&
//                   performanceTeam[item.toString()] &&
//                   performanceTeam[item.toString()][prop]
//                     ? performanceTeam[item.toString()][prop] + 1
//                     : 1,
//               };
//             } else {
//               const prop = Object.keys(time)[0].toString();
//               performanceTeam[item.toString()] = {
//                 ...performanceTeam[item.toString()],
//                 [prop]:
//                   performanceTeam &&
//                   performanceTeam[item.toString()] &&
//                   performanceTeam[item.toString()][prop]
//                     ? performanceTeam[item.toString()][prop]
//                     : 0,
//               };
//             }
//           }
//         }
//       }
//     }
//     const data = {
//       total,
//       count: results.length,
//       listTeamleadTag,
//       data: {
//         performanceTeam,
//       },
//     };
//     res
//       .status(200)
//       .json({ success: true, message: "get dashboard successful", data });
//   } catch (error) {
//     console.log("ERROR", error);
//     res.status(400).json({ success: false, message: error.message });
//   }
// };
// const calcPerformanceSales = async (req, res) => {
//   try {
//     const {filters, filterPlus, lastFilter, arrayTimes} = req.body
//     const listSalesTag = await CustomerModel.distinct("salesTag", {
//       ...filterPlus,
//       ...filters,
//     });
//     const total = await CustomerModel.countDocuments(filterPlus);
//     const results = multiFilter(fetchCustomers, { ...filterPlus, ...lastFilter });
//     // console.log({results})
//     // const result = await CustomerModel.find(filterPlus)
//     let performanceSales = {};
//     for (const result of results) {
//       for (const item of listSalesTag) {
//         if (
//           item &&
//           result.salesTag &&
//           result.salesTag.toString() === item.toString()
//         ) {
//           for (const time of arrayTimes) {
//             if (
//               new Date(result.createdAt) >=
//                 new Date(time[Object.keys(time)[0]]) &&
//               new Date(result.createdAt) <
//                 new Date(time[Object.keys(time)[0]] + 60 * 60 * 1000)
//             ) {
//               const prop = Object.keys(time)[0].toString();
//               performanceSales[item.toString()] = {
//                 ...performanceSales[item.toString()],
//                 [prop]:
//                   performanceSales &&
//                   performanceSales[item.toString()] &&
//                   performanceSales[item.toString()][prop]
//                     ? performanceSales[item.toString()][prop] + 1
//                     : 1,
//               };
//             } else {
//               const prop = Object.keys(time)[0].toString();
//               performanceSales[item.toString()] = {
//                 ...performanceSales[item.toString()],
//                 [prop]:
//                   performanceSales &&
//                   performanceSales[item.toString()] &&
//                   performanceSales[item.toString()][prop]
//                     ? performanceSales[item.toString()][prop]
//                     : 0,
//               };
//             }
//           }
//         }
//       }
//     }
//     const data = {
//       total,
//       count: results.length,
//       listSalesTag,
//       data: {
//         performanceSales,
//       },
//     };
//     res
//       .status(200)
//       .json({ success: true, message: "get dashboard successful", data });
//   } catch (error) {
//     console.log("ERROR", error);
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

export default {
  // calcDashboardCRM,
  // calcPerformanceSup,
  // calcPerformanceTeam,
  // calcPerformanceSales,
  fetchCDRToDownload,
  migrateCDR,
};
