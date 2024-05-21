import mysqlInstance from "../../controllers/mysql/index.js";
import Bluebird from "bluebird";
import { getParamsCDRMongo, getParamsCDR } from "./getParams.js";
import { getParams } from "../../util/getParams/index.js";
import {
  UserModel,
  CustomerModel,
  CDRModel,
} from "../../controllers/mongodb/index.js";
import { exportExcel } from "../../util/excel/excel.js";
import axios from "axios";
import {ASTERISK_HOST, WORKER_PORT, WORKER_HOST } from "../../util/config/index.js";

// let customers = await CustomerModel.find().exec();
// setInterval(async () => {
//   customers = await CustomerModel.find().exec();
// }, (5 * 60 + Math.floor(Math.random() * 10)) * 1000);

let customers = [];
setTimeout(async () => {
  customers = await CustomerModel.find().lean().exec();
  // console.log({ customers });
}, 1 * 15 * 1000);
// setInterval(async () => {
//   customers = await CustomerModel.find().lean().exec();
//   // console.log({ customers });
// }, (5 * 60 + Math.floor(Math.random() * 10)) * 1000);

const upadateFetchCustomers = async (data) => {
  customers = data;
};

const fetchCDRMongo = async (req, res) => {
  try {
    // fecth CDR start
    const {filters, options} = getParamsCDRMongo
    const total = await CDRModel.count(filters);
    const result = await CDRModel.find(
      filters,
      null,
      options
    ).populate("user", ["name"]);
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        total,
        count: result.length,
        page: options.skip + 1,
        limit: options.limit,
        data: result,
      },
    });
  } catch (error) {
    console.log({ error });
    res.status(400).json({ success: false, message: "Can not get list" });
  }
};

const fetchCDR = async (req, res) => {
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
      // console.log("users: ", users);
    }
    if (!listCnum && !users.toString()) throw new Error("List not exist");
    if (!req.query.cnum) {
      req.query.cnum = listCnum;
    }

    // fecth CDR start

    const { filter, page, limit, offset } = getParamsCDR(req);
    console.log({ filter });

    const [total, result] = await Bluebird.all([
      mysqlInstance.execQuery(`SELECT COUNT(*) AS total FROM cdr${filter}`),
      mysqlInstance.execQuery(
        `SELECT calldate, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter} ORDER BY cdr.calldate DESC LIMIT ${limit} OFFSET ${offset}`
      ),
    ]);
    // console.log({total})
    let resultMapUser = [];
    for (const item of result) {
      let name = "No Name";
      let dstName = "";
      let userID = "";
      let dstID = "";
      const itemValidate = {
        ...item,
        disposition:
          item.disposition === "ANSWERED" && item.lastapp !== "Dial"
            ? "BUSY"
            : item.disposition,
        billsec:
          (item.disposition === "NO ANSWER" && item.billsec > 0) ||
          item.lastapp !== "Dial"
            ? 0
            : item.disposition === "ANSWERED" && item.billsec === 0
            ? 1
            : item.billsec,
        linkRecord:
          item.recordingfile && item.lastapp === "Dial"
            ? `http://${ASTERISK_HOST}:8080/admin/recordings/${String(
                item.recordingfile.split("-")[3]
              ).slice(0, 4)}/${String(item.recordingfile.split("-")[3]).slice(
                4,
                6
              )}/${String(item.recordingfile.split("-")[3]).slice(6, 8)}/${
                item.recordingfile
              }`
            : "",
      };
      users.map((user) => {
        if (user.sipAccount.extension === item.cnum) {
          name = user.name;
          userID = user._id.toString();
        }
      });
      customers.map((customer) => {
        if (customer.phone === item.dst) {
          dstName = customer.name;
          if (
            (customer.userTag && customer.userTag.toString() === userID) ||
            (customer.salesTag && customer.salesTag.toString() === userID) ||
            (customer.teamleadTag &&
              customer.teamleadTag.toString() === userID) ||
            (customer.supervisorTag &&
              customer.supervisorTag.toString() === userID)
          ) {
            dstID = customer._id;
          }
        }
      });
      if (name !== "No Name")
        resultMapUser.push({ name, userID, dstName, dstID, ...itemValidate });
    }
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        total: total[Object.keys(total)[0]].total,
        count: result.length,
        page,
        limit,
        data: resultMapUser,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: "Can not get list" });
  }
};

const updateCDR = async (cnum, dst, linkedid) => {
  try {
    console.log({ cnum, dst, linkedid });
    setTimeout(async () => {
      const users = await UserModel.find().lean().exec();

      // fecth CDR start
      let filter = "";
      if (dst) {
        filter +=
          filter.split("WHERE").length <= 1
            ? ` WHERE dst IN (${dst})`
            : ` AND dst IN (${dst})`;
      }
      if (cnum) {
        filter +=
          filter.split("WHERE").length <= 1
            ? ` WHERE cnum IN (${cnum})`
            : ` AND cnum IN (${cnum})`;
      }
      if (linkedid) {
        filter +=
          filter.split("WHERE").length <= 1
            ? ` WHERE linkedid IN (${linkedid})`
            : ` AND linkedid IN (${linkedid})`;
      }
      const limit = 1;
      console.log({ filter });

      const [result] = await Bluebird.all([
        // mysqlInstance.execQuery(`SELECT COUNT(*) AS total FROM cdr${filter}`),
        mysqlInstance.execQuery(
          `SELECT * FROM cdr${filter} AND lastapp IN ('Dial') ORDER BY cdr.calldate DESC LIMIT ${limit}`
        ),
      ]);
      console.log({ result });
      // let resultMapUser = [];
      let lastData = [];
      if (result)
        for (const item of result) {
          let name = "No Name";
          let dstName = "";
          let userID = null;
          let dstID = null;
          const itemValidate = {
            ...item,
            disposition:
              item.disposition === "ANSWERED" && item.lastapp !== "Dial"
                ? "BUSY"
                : item.disposition,
            billsec:
              (item.disposition === "NO ANSWER" && item.billsec > 0) ||
              item.lastapp !== "Dial"
                ? 0
                : item.disposition === "ANSWERED" && item.billsec === 0
                ? 1
                : item.billsec,
            linkRecord:
              item.recordingfile && item.lastapp === "Dial"
                ? `http://${ASTERISK_HOST}:8080/admin/recordings/${String(
                    item.recordingfile.split("-")[3]
                  ).slice(0, 4)}/${String(
                    item.recordingfile.split("-")[3]
                  ).slice(4, 6)}/${String(
                    item.recordingfile.split("-")[3]
                  ).slice(6, 8)}/${item.recordingfile}`
                : "",
          };
          users.map((user) => {
            if (user.sipAccount.extension === item.cnum) {
              name = user.name;
              userID = user._id;
            }
          });
          customers.map((customer) => {
            if (customer.phone === item.dst) {
              dstName = customer.name;
              if (
                (customer.userTag &&
                  customer.userTag.toString() === userID.toString()) ||
                (customer.salesTag &&
                  customer.salesTag.toString() === userID.toString()) ||
                (customer.teamleadTag &&
                  customer.teamleadTag.toString() === userID) ||
                (customer.supervisorTag &&
                  customer.supervisorTag.toString() === userID)
              ) {
                dstID = customer._id;
              }
            }
          });
          if (name !== "No Name") {
            // resultMapUser.push({ name, userID, dstName, dstID, ...itemValidate });
            // console.log({resultMapUser})
            const check = await CDRModel.find({
              user: userID,
              name,
              dstName,
              dstID: dstID,
              cnum: item.cnum,
              cnam: item.cnam,
              dst: item.dst,
              duration: item.duration,
              billsec: itemValidate.billsec,
              disposition: itemValidate.disposition,
              lastapp: item.lastapp,
              linkRecord: itemValidate.linkRecord,
              createdAt: item.calldate,
            });
            console.log({ check });

            if (check.length == 0) {
              await CDRModel.create({
                user: userID,
                name,
                dstName,
                dstID: dstID,
                cnum: item.cnum,
                cnam: item.cnam,
                dst: item.dst,
                duration: item.duration,
                billsec: itemValidate.billsec,
                disposition: itemValidate.disposition,
                lastapp: item.lastapp,
                linkRecord: itemValidate.linkRecord,
                createdAt: item.calldate,
              })
              // lastData.push({
              //   user: userID,
              //   name,
              //   dstName,
              //   dstID: dstID,
              //   cnum: item.cnum,
              //   cnam: item.cnam,
              //   dst: item.dst,
              //   duration: item.duration,
              //   billsec: itemValidate.billsec,
              //   disposition: itemValidate.disposition,
              //   lastapp: item.lastapp,
              //   linkRecord: itemValidate.linkRecord,
              //   createdAt: item.calldate,
              // });
            }
          }
        }

      // console.log({ lastData });
      // await CDRModel.insertMany(lastData);
      console.log({
        success: true,
        message: `update data cdr to mongo successful - ${lastData.length} inserted`,
      });
    }, 15 * 1000);
  } catch (error) {
    console.log({ error });
  }
};

const migrateCDR = async (req, res) => {
  try {
    const fromDate = req.query.fromDate
    const requestConfig = {
      method: "get",
      url: `http://${WORKER_HOST}:${WORKER_PORT}/worker/migrateCDR?fromDate=${fromDate}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
    };
    let success = false;
    let message = ''
    let dataError = {};
    await axios(requestConfig)
      .then((res) => {
        success = res.data.success
        message = res.data.message
        // console.log('res: ', res)
        
      })
      .catch((error) => {
        // console.log(error.response.data)
        dataError = error.response.data;
      });
    console.log({ dataError });
    if (Object.keys(dataError).length !== 0) throw new Error(dataError.message);
    if(success)
      res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    console.log({ error });
    res.status(400).json({ success: false, message: error.message });
  }
};
// const migrateCDR = async (req, res) => {
//   try {
//     // const rolePermit = req.decode.role;
//     // const id = req.decode.id;
//     // const user = await UserModel.findById(id);
//     // const { filters } = getParams(req);
//     // let filterPlus = {};
//     // const { role } = req.query

//     const users = await UserModel.find().lean().exec();
//     const customers = await CustomerModel.find().lean().exec();

//     let listCnum = "";
//     for (const user of users) {
//       if (user.sipAccount.extension) {
//         if (listCnum.length < 1) {
//           listCnum = listCnum + user.sipAccount.extension;
//         } else {
//           listCnum = listCnum + "," + user.sipAccount.extension;
//         }
//       }
//     }
//     if (!listCnum && !users.toString()) throw new Error("List not exist");
//     if (!req.query.cnum) {
//       req.query.cnum = listCnum;
//     }

//     // fecth CDR start
//     // const newDate = new Date();
//     // const fromDate = new Date(new Date().getTime() - 4 * 24 * 60 * 60 * 1000);
//     // req.query.fromDate = fromDate;
//     const { filter } = getParamsCDR(req);
//     console.log({ filter });

//     const [ result] = await Bluebird.all([
//       mysqlInstance.execQuery(
//         `SELECT calldate, cnum, dst, duration, billsec, disposition, recordingfile, cnam, lastapp FROM cdr${filter}`
//       ),
//     ]);
//     // console.log({total, result})
//     // let resultMapUser = [];
//     let lastData = [];
//     if (result)
//       for (const item of result) {
//         let name = "No Name";
//         let dstName = "";
//         let userID = null;
//         let dstID = null;
//         const itemValidate = {
//           ...item,
//           disposition:
//             item.disposition === "ANSWERED" && item.lastapp !== "Dial"
//               ? "BUSY"
//               : item.disposition,
//           billsec:
//             (item.disposition === "NO ANSWER" && item.billsec > 0) ||
//             item.lastapp !== "Dial"
//               ? 0
//               : item.disposition === "ANSWERED" && item.billsec === 0
//               ? 1
//               : item.billsec,
//           linkRecord:
//             item.recordingfile && item.lastapp === "Dial"
//               ? `http://${ASTERISK_HOST}:8080/admin/recordings/${String(
//                   item.recordingfile.split("-")[3]
//                 ).slice(0, 4)}/${String(item.recordingfile.split("-")[3]).slice(
//                   4,
//                   6
//                 )}/${String(item.recordingfile.split("-")[3]).slice(6, 8)}/${
//                   item.recordingfile
//                 }`
//               : "",
//         };
//         users.map((user) => {
//           if (user.sipAccount.extension === item.cnum) {
//             name = user.name;
//             userID = user._id;
//           }
//         });
//         customers.map((customer) => {
//           if (customer.phone === item.dst) {
//             dstName = customer.name;
//             if (
//               (customer.userTag &&
//                 customer.userTag.toString() === userID.toString()) ||
//               (customer.salesTag &&
//                 customer.salesTag.toString() === userID.toString()) ||
//               (customer.teamleadTag &&
//                 customer.teamleadTag.toString() === userID) ||
//               (customer.supervisorTag &&
//                 customer.supervisorTag.toString() === userID)
//             ) {
//               dstID = customer._id;
//             }
//           }
//         });
//         if (name !== "No Name") {
//           // resultMapUser.push({ name, userID, dstName, dstID, ...itemValidate });
//           // console.log({resultMapUser})
//           const check = await CDRModel.find({
//             user: userID,
//             name,
//             dstName,
//             dstID: dstID,
//             cnum: item.cnum,
//             cnam: item.cnam,
//             dst: item.dst,
//             duration: item.duration,
//             billsec: itemValidate.billsec,
//             disposition: itemValidate.disposition,
//             lastapp: item.lastapp,
//             linkRecord: itemValidate.linkRecord,
//             createdAt: item.calldate,
//           });
//           // console.log({check})

//           if (check.length == 0) {
//             await CDRModel.create({
//               user: userID,
//               name,
//               dstName,
//               dstID: dstID,
//               cnum: item.cnum,
//               cnam: item.cnam,
//               dst: item.dst,
//               duration: item.duration,
//               billsec: itemValidate.billsec,
//               disposition: itemValidate.disposition,
//               lastapp: item.lastapp,
//               linkRecord: itemValidate.linkRecord,
//               createdAt: item.calldate,
//             })

//             lastData.push({
//               user: userID,
//               name,
//               dstName,
//               dstID: dstID,
//               cnum: item.cnum,
//               cnam: item.cnam,
//               dst: item.dst,
//               duration: item.duration,
//               billsec: itemValidate.billsec,
//               disposition: itemValidate.disposition,
//               lastapp: item.lastapp,
//               linkRecord: itemValidate.linkRecord,
//               createdAt: item.calldate,
//             });
//           }

//         }
//       }

//     // console.log({ lastData });
//     // await CDRModel.insertMany(lastData);
//     res.status(200).json({
//       success: true,
//       message: `migarate data cdr successful - ${lastData.length} inserted`,
//     });
//   } catch (error) {
//     console.log({ error });
//     res.status(400).json({ success: false, message: "Can not get list" });
//   }
// };

const countCDR = async (req, res) => {
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
    if (!req.query.cnum) {
      req.query.cnum = listCnum;
    }

    // count CDR start
    const { filter } = getParamsCDR(req);
    console.log({ filter });

    const [total] = await Bluebird.all([
      mysqlInstance.execQuery(`SELECT COUNT(*) AS total FROM cdr${filter}`),
    ]);
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        total: total[Object.keys(total)[0]].total,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: "Can not count list" });
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

const fetchTalkTime = async (req, res) => {
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
          unitPrice: user.company?.unitPrice,
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

    let totalTalktime = 0;
    let totalTalktimeViettel = 0;
    let totalTalktimeVinaphone = 0;
    let totalTalktimeMobifone = 0;
    let totalTalktimeVietnammobile = 0;
    let totalBills = 0;
    let totalBillsViettel = 0;
    let totalBillsVinaphone = 0;
    let totalBillsMobifone = 0;
    let totalBillsVietnammobile = 0;
    let totalCall = 0;
    let totalCallViettel = 0;
    let totalCallVinaphone = 0;
    let totalCallMobifone = 0;
    let totalCallVietnammobile = 0;
    let totalCallAnswered = 0;
    let totalCallNoAnswer = 0;
    let totalCallBusy = 0;
    let totalCallFailed = 0;
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
      let call = 0;
      let callViettel = 0;
      let callVinaphone = 0;
      let callMobifone = 0;
      let callVietnammobile = 0;
      let callAnswered = 0;
      let callNoAnswer = 0;
      let callBusy = 0;
      let callFailed = 0;

      for (const item of result) {
        //filter by Telco
        const checkNumber = item.dst.slice(0, 3);
        if (
          (item.cnum === user.cnum &&
            item.disposition === "ANSWERED" &&
            item.lastapp !== "Dial") ||
          (item.cnum === user.cnum && item.disposition === "BUSY")
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            callViettel += 1;
            totalCallViettel += 1;
            call += 1;
            totalCall += 1;
            callBusy += 1;
            totalCallBusy += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            callVinaphone += 1;
            totalCallVinaphone += 1;
            call += 1;
            totalCall += 1;
            callBusy += 1;
            totalCallBusy += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            callMobifone += 1;
            totalCallMobifone += 1;
            call += 1;
            totalCall += 1;
            callBusy += 1;
            totalCallBusy += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            callVietnammobile += 1;
            totalCallVietnammobile += 1;
            call += 1;
            totalCall += 1;
            callBusy += 1;
            totalCallBusy += 1;
          }
        } else if (
          item.cnum === user.cnum &&
          item.disposition === "NO ANSWER"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            callViettel += 1;
            totalCallViettel += 1;
            call += 1;
            totalCall += 1;
            callNoAnswer += 1;
            totalCallNoAnswer += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            callVinaphone += 1;
            totalCallVinaphone += 1;
            call += 1;
            totalCall += 1;
            callNoAnswer += 1;
            totalCallNoAnswer += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            callMobifone += 1;
            totalCallMobifone += 1;
            call += 1;
            totalCall += 1;
            callNoAnswer += 1;
            totalCallNoAnswer += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            callVietnammobile += 1;
            totalCallVietnammobile += 1;
            call += 1;
            totalCall += 1;
            callNoAnswer += 1;
            totalCallNoAnswer += 1;
          }
        } else if (item.cnum === user.cnum && item.disposition === "FAILED") {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            callViettel += 1;
            totalCallViettel += 1;
            call += 1;
            totalCall += 1;
            callFailed += 1;
            totalCallFailed += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            callVinaphone += 1;
            totalCallVinaphone += 1;
            call += 1;
            totalCall += 1;
            callFailed += 1;
            totalCallFailed += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            callMobifone += 1;
            totalCallMobifone += 1;
            call += 1;
            totalCall += 1;
            callFailed += 1;
            totalCallFailed += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            callVietnammobile += 1;
            totalCallVietnammobile += 1;
            call += 1;
            totalCall += 1;
            callFailed += 1;
            totalCallFailed += 1;
          }
        } else if (item.cnum === user.cnum && item.disposition === "ANSWERED") {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            callViettel += 1;
            totalCallViettel += 1;
            call += 1;
            totalCall += 1;
            callAnswered += 1;
            totalCallAnswered += 1;
            talktimeViettel += Number(item.billsec);
            talktime += Number(item.billsec);
            billViettel +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.viettel || 0) / 60) * 6
                : (Number(user.unitPrice.viettel || 0) / 60) * Number(item.billsec);
            totalBill +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.viettel || 0) / 60) * 6
                : (Number(user.unitPrice.viettel || 0) / 60) * Number(item.billsec);
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            callVinaphone += 1;
            totalCallVinaphone += 1;
            call += 1;
            totalCall += 1;
            callAnswered += 1;
            totalCallAnswered += 1;
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
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            callMobifone += 1;
            totalCallMobifone += 1;
            call += 1;
            totalCall += 1;
            callAnswered += 1;
            totalCallAnswered += 1;
            talktimeMobifone += Number(item.billsec);
            talktime += Number(item.billsec);
            billMobifone +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.mobifone || 0) / 60) * 6
                : (Number(user.unitPrice.mobifone || 0) / 60) * Number(item.billsec);
            totalBill +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.mobifone || 0) / 60) * 6
                : (Number(user.unitPrice.mobifone || 0) / 60) * Number(item.billsec);
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            callVietnammobile += 1;
            totalCallVietnammobile += 1;
            call += 1;
            totalCall += 1;
            callAnswered += 1;
            totalCallAnswered += 1;
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
        call,
        callViettel,
        callVinaphone,
        callMobifone,
        callVietnammobile,
        callAnswered,
        callNoAnswer,
        callBusy,
        callFailed,
      });
      totalTalktime += talktime;
      totalTalktimeViettel += talktimeViettel;
      totalTalktimeVinaphone += talktimeVinaphone;
      totalTalktimeMobifone += talktimeMobifone;
      totalTalktimeVietnammobile += talktimeVietnammobile;
      totalBills += totalBill;
      totalBillsViettel += billViettel;
      totalBillsVinaphone += billVinaphone;
      totalBillsMobifone += billMobifone;
      totalBillsVietnammobile += billVietnammobile;
    }
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        aggregateTalktime: {
          Total: totalTalktime,
          Viettel: totalTalktimeViettel,
          Vinaphone: totalTalktimeVinaphone,
          Mobifone: totalTalktimeMobifone,
          Vietnammobile: totalTalktimeVietnammobile,
        },
        aggregateBills: {
          Total: totalBills,
          Viettel: totalBillsViettel,
          Vinaphone: totalBillsVinaphone,
          Mobifone: totalBillsMobifone,
          Vietnammobile: totalBillsVietnammobile,
        },
        aggregateCall: {
          Total: totalCall,
          Viettel: totalCallViettel,
          Vinaphone: totalCallVinaphone,
          Mobifone: totalCallMobifone,
          Vietnammobile: totalCallVietnammobile,
        },
        aggregateCallStatus: {
          Total: totalCall,
          Answered: totalCallAnswered,
          NoAnswer: totalCallNoAnswer,
          Busy: totalCallBusy,
          Failed: totalCallFailed,
        },
        data: talktimeResult,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Can not fetch talk time - ${error.message}`,
    });
  }
};

const aggregateCDRLatest = async (req, res) => {
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
          unitPrice: user.company?.unitPrice,
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
    req.query.lastapp = 'Dial'

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
    let dataTotal = {};
    let dataAnswered = {};
    let dataNoAnswer = {};
    let dataBusy = {};
    let dataFailed = {};

    // caculate time
    const hours = new Date().getHours() + 7;
    // console.log({ hours });
    const arrayTimes = new Array(24).fill().map((item, index) => {
      return {
        [hours - index >= 0 ? hours - index : 24 + (hours - index)]:
          new Date().setHours(hours, 0, 0) - index * 60 * 60 * 1000,
        parse: new Date(
          new Date().setHours(hours, 0, 0) - index * 60 * 60 * 1000
        ).toISOString(),
      };
    });
    // console.log({ arrayTimes });

    // init data
    arrayTimes.map((time) => {
      dataTotal[Object.keys(time)[0]] = 0;
      dataAnswered[Object.keys(time)[0]] = 0;
      dataNoAnswer[Object.keys(time)[0]] = 0;
      dataBusy[Object.keys(time)[0]] = 0;
      dataFailed[Object.keys(time)[0]] = 0;
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
            dataTotal[key] += 1;
            dataBusy[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataBusy[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataBusy[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataTotal[key] += 1;
            dataBusy[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "NO ANSWER"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataNoAnswer[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataNoAnswer[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataNoAnswer[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataTotal[key] += 1;
            dataNoAnswer[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "FAILED"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataFailed[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataFailed[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataFailed[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataTotal[key] += 1;
            dataFailed[key] += 1;
          }
        } else if (
          new Date(item.calldate) >= timeConditionStart &&
          new Date(item.calldate) < timeConditionEnd &&
          item.disposition === "ANSWERED"
        ) {
          if (telco.includes("Viettel") && viettel.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataAnswered[key] += 1;
          }
          if (telco.includes("Vinaphone") && vinaphone.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataAnswered[key] += 1;
          }
          if (telco.includes("Mobifone") && mobifone.includes(checkNumber)) {
            dataTotal[key] += 1;
            dataAnswered[key] += 1;
          }
          if (
            telco.includes("Vietnammobile") &&
            vietnammobile.includes(checkNumber)
          ) {
            dataTotal[key] += 1;
            dataAnswered[key] += 1;
          }
        }
      }
    }
    res.status(200).json({
      success: true,
      message: "get list cdr successful",
      data: {
        dataTotal,
        dataAnswered,
        dataNoAnswer,
        dataBusy,
        dataFailed,
      },
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
        if( !user.company) console.log('userNotUnitprice: ', user)
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
    req.query.lastapp = 'Dial'

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
    console.log({error})
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

    req.query.lastapp = 'Dial'

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
                : (Number(user.unitPrice.viettel || 0) / 60) * Number(item.billsec);
            totalBill +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.viettel || 0) / 60) * 6
                : (Number(user.unitPrice.viettel || 0) / 60) * Number(item.billsec);
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
                : (Number(user.unitPrice.mobifone || 0) / 60) * Number(item.billsec);
            totalBill +=
              Number(item.billsec) <= 6
                ? (Number(user.unitPrice.mobifone || 0) / 60) * 6
                : (Number(user.unitPrice.mobifone || 0) / 60) * Number(item.billsec);
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
  fetchCDR,
  countCDR,
  fetchTalkTime,
  fetchTalkTimeToDownload,
  fetchCDRToDownload,
  aggregateCDRAmPm,
  aggregateCDRLatest,
  aggregateRankedByTimeFrame,
  upadateFetchCustomers,
  migrateCDR,
  updateCDR,
  fetchCDRMongo,
};
