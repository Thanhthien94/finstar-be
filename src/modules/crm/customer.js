import { CustomerModel } from "../../controllers/mongodb/models/Customer.js";
import { promises as fsPromises } from "fs";
// import zip from 'express-zip'
import { readExcel, exportExcel } from "../../util/excel/excel.js";
import { multiFilter } from "../../util/filtersParams/index.js";
import {
  UserModel,
  CompanyModel,
  LinkCardModel,
  BankModel,
  DashBoardModel,
  TaskModel,
} from "../../controllers/mongodb/index.js";
import { getParams } from "../../util/getParams/index.js";
import { getRule } from "../../util/validation/getRule.js";
import moment from "../../util/monent/moment.js";
import cdr from "../cdr/controller.js";
// import os from "os";
import { APP_PORT, DOMAIN } from "../../util/config/index.js";

//app
// const networkInterfaces = os.networkInterfaces();
// const ip = networkInterfaces[Object.keys(networkInterfaces)[1]][0]?.address;
const port = APP_PORT;
const domain = DOMAIN;
const apiPath = "/api/crm/customer/download/pdf";
// console.log(
//   "networkInterface: ",
//   networkInterfaces[Object.keys(networkInterfaces)[1]][0].address
// );
// console.log("date: ", new Date());

let fetchCustomers = [];
// setTimeout(async () => {
//   fetchCustomers = await CustomerModel.find().lean().exec();
// }, 1 * 10 * 1000);
// setInterval(async () => {
//   fetchCustomers = await CustomerModel.find().lean().exec();
//   cdr.upadateFetchCustomers(fetchCustomers);
// }, (5 * 60 + Math.floor(Math.random() * 10)) * 1000);

// const upadateFetchCustomers = async () => {
//   setTimeout(async () => {
//     fetchCustomers = await CustomerModel.find().lean().exec();
//     cdr.upadateFetchCustomers(fetchCustomers);
//   }, 1000);
// };

const findCompany = () => {
  CompanyModel.find();
};

const creatCustomer = async (req, res) => {
  const { id } = req.decode;
  let customer = req.body;
  customer = { ...customer, user: id };
  await CustomerModel.create(customer);
  console.log({ id, customer });
  res.json(customer);
};

const createCustomerLinkCard = async (req, res) => {
  try {
    let customer = req.body;
    // console.log("req.body:", req.body);
    const { name, id, phone, identification, email, campaign, linkCard } =
      customer;
    if (phone.length !== 10) throw new Error("Định dạng SĐT không đúng");
    if (identification.length !== 9 && identification.length !== 12)
      throw new Error("Định dạng CMND hoặc CCCD không đúng");
    const newDate = new Date();
    if (!name) throw new Error("Chưa nhập Tên");
    if (!phone) throw new Error("Chưa nhập SDT");
    if (!identification) throw new Error("Chưa nhập CCCD/CMND");
    const user = await UserModel.findById(id);
    const companyTag = user.company;
    const teamleadTag = user.teamleadTag || null;
    const supervisorTag = user.supervisorTag || null;
    const ASMTag = user.ASMTag || null;
    const headTag = user.headTag || null;
    const ADPTag = user.ADPTag || null;

    const query = {
      project: "link-card",
      "linkCard.bank": linkCard.bank,
      $or: [{ identification }, { phone }],
    };

    // console.log("user query", JSON.stringify(query));
    const findCustomers = await CustomerModel.findOne(query);
    // console.log({ findCustomers });
    if (findCustomers) throw new Error("Thông tin đã tồn tại");

    if (!findCustomers && user.role === "sales") {
      const data = await CustomerModel.create({
        name,
        phone,
        identification,
        email,
        project: "link-card",
        campaign,
        statusCode: "Pending",
        linkCard,
        companyTag,
        salesTag: id,
        teamleadTag,
        supervisorTag,
        ASMTag,
        headTag,
        ADPTag,
        status: "Pending",
      });
      await UserModel.findByIdAndUpdate(id, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(teamleadTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(supervisorTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(ASMTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(headTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(ADPTag, {
        newLead: { createdAt: newDate },
      });
      // const dataDashBoard = DashBoardModel.findOne({name: 'link-card', companyTag})
      // await DashBoardModel.findOneAndUpdate({name: 'link-card', companyTag},{'data.bank': {[linkCard.bank]:{sub:{$inc:{'total':1}}, }}})
      res
        .status(200)
        .json({ success: true, message: "Create successful", data });
    } else if (!findCustomers && user.role === "teamlead") {
      // customer = { ...customer, salesTag: id };
      const data = await CustomerModel.create({
        name,
        phone,
        identification,
        email,
        project: "link-card",
        campaign,
        statusCode: "Pending",
        linkCard,
        companyTag,
        teamleadTag: id,
        supervisorTag,
        ASMTag,
        headTag,
        ADPTag,
        status: "Pending",
      });
      await UserModel.findByIdAndUpdate(id, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(supervisorTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(ASMTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(headTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(ADPTag, {
        newLead: { createdAt: newDate },
      });
      res
        .status(200)
        .json({ success: true, message: "Create successful", data });
    } else if (!findCustomers && user.role === "supervisor") {
      const data = await CustomerModel.create({
        name,
        phone,
        identification,
        email,
        project: "link-card",
        campaign,
        statusCode: "Pending",
        linkCard,
        companyTag,
        supervisorTag: id,
        ASMTag,
        headTag,
        ADPTag,
        status: "Pending",
      });
      await UserModel.findByIdAndUpdate(id, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(ASMTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(headTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(ADPTag, {
        newLead: { createdAt: newDate },
      });
      res
        .status(200)
        .json({ success: true, message: "Create successful", data });
    } else if (
      (!findCustomers && user.role === "admin") ||
      (!findCustomers && user.role === "root") ||
      (!findCustomers && user.role === "ASM")
    ) {
      const data = await CustomerModel.create({
        name,
        phone,
        identification,
        email,
        project: "link-card",
        campaign,
        statusCode: "Pending",
        linkCard,
        user: id,
        companyTag,
        teamleadTag,
        supervisorTag,
        ASMTag,
        headTag,
        ADPTag,
        status: "Pending",
      });
      await UserModel.findByIdAndUpdate(id, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(headTag, {
        newLead: { createdAt: newDate },
      });
      await UserModel.findByIdAndUpdate(ADPTag, {
        newLead: { createdAt: newDate },
      });
      res
        .status(200)
        .json({ success: true, message: "Create successful", data });
    }
    // upadateFetchCustomers();
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
const createTask = async (req, res) => {
  try {
    console.log("req.body: ", req.body);
    const { id } = req.decode;
    const { reminder, content, name, customerID, reminderFlagged } = req.body;
    // const user = await UserModel.findById(id).lean().exec();
    const findCustomer = await CustomerModel.findById(customerID).lean().exec();
    await TaskModel.create({
      name,
      content,
      reminderTime: new Date(reminder),
      flagged: reminderFlagged,
      user: id,
      customer: customerID,
      ADPTag: findCustomer.ADPTag,
      headTag: findCustomer.headTag,
      ASMTag: findCustomer.ASMTag,
      supervisorTag: findCustomer.supervisorTag,
      teamleadTag: findCustomer.teamleadTag,
      salesTag: findCustomer.salesTag,
      companyTag: findCustomer.companyTag,
    });

    // upadateFetchCustomers();
    res.status(200).json({ success: true, message: "New task was created" });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
const updateTask = async (req, res) => {
  try {
    console.log("req.body: ", req.body);
    const { id } = req.decode;
    const { _id, status, flagged } = req.body;
    await TaskModel.findByIdAndUpdate(_id, {
      status,
      flagged,
    });

    // upadateFetchCustomers();
    res.status(200).json({ success: true, message: "Update task successful" });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const { role, id } = req.decode;
    const user = await UserModel.findById(id).populate("company").lean().exec();
    // console.log({user})

    const companyTag = user.company._id.toString();
    const headTag = id;
    const ASMTag = id;
    const supervisorTag = id;
    const teamleadTag = id;
    const salesTag = id;
    const project = req.query.project;
    // console.log({ project });
    const { filters } = getParams(req);
    const lastFilters = {
      headTag: req.query.headTag || "",
      ASMTag: req.query.ASMTag || "",
      supervisorTag: req.query.supervisorTag || "",
      teamleadTag: req.query.teamleadTag || "",
      salesTag: req.query.salesTag || "",
      project: req.query.project || "",
      campaign: req.query.campaign || "",
      statusCode: req.query.statusCode || "",
      createdAt: {
        $gte: req.query.gteDate
          ? new Date(new Date(req.query.gteDate).getTime() - 7 * 60 * 60 * 1000)
          : "",
        $lte: req.query.lteDate
          ? new Date(new Date(req.query.lteDate).getTime() - 7 * 60 * 60 * 1000)
          : "",
      },
    };
    // console.log("+++++++ filter: ", filter);

    let filterPlus = {};
    let filterWithProject = project ? { project, ...filters } : { ...filters };

    if (role === "admin") {
      filterPlus = { companyTag };
      filterWithProject = { companyTag, ...filterWithProject };
    }
    if (role === "head") {
      filterPlus = { headTag };
      filterWithProject = { headTag, ...filterWithProject };
    }
    if (role === "ASM") {
      filterPlus = { ASMTag };
      filterWithProject = { ASMTag, ...filterWithProject };
    }
    if (role === "supervisor") {
      filterPlus = { supervisorTag };
      filterWithProject = { supervisorTag, ...filterWithProject };
    }
    if (role === "teamlead") {
      filterPlus = { teamleadTag };
      filterWithProject = { teamleadTag, ...filterWithProject };
    }
    if (role === "sales") {
      filterPlus = { salesTag };
      filterWithProject = { salesTag, ...filterWithProject };
    }

    // // req to worker
    // let dataCalc = {}
    // let dataError = {}
    // const requestConfig = {
    //   method: "post",
    //   url: `http://${WORKER_HOST}:${WORKER_PORT}/worker/crm/calcDashboard`,
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   data: {lastFilters, filterPlus, filterWithProject},
    // }
    // await axios(requestConfig)
    // .then((res)=>{
    //   console.log('data res: ', res.data)
    //   dataCalc = res.data.data
    // })
    // .catch((error)=>{
    //   console.log(error.response.data)
    //   dataError = error.response.data
    // })
    // if (Object.keys(dataError).length!==0) throw new Error(dataError.message)

    const listProject = await CustomerModel.distinct("project", filterPlus);
    const listSupTag = await CustomerModel.distinct(
      "supervisorTag",
      filterPlus
    );
    const listTeamleadTag = await CustomerModel.distinct(
      "teamleadTag",
      filterPlus
    );
    const listSalesTag = await CustomerModel.distinct("salesTag", filterPlus);
    const listBank = await CustomerModel.distinct("linkCard.bank", filterPlus);
    const listCampaign = await CustomerModel.distinct(
      "campaign",
      filterWithProject
    );
    const listStatusCode = await CustomerModel.distinct(
      "statusCode",
      filterWithProject
    );
    const total = await CustomerModel.countDocuments(filterPlus);
    const results = multiFilter(fetchCustomers, {
      ...filterPlus,
      ...lastFilters,
    });
    // console.log({results})
    // const result = await CustomerModel.find(filterPlus)
    let aggregateProject = {};
    let aggregateCampaign = {};
    let aggregateStatusCode = {};
    let aggregateSupInit = {};
    let aggregateSup = {};
    let aggregateTeamleadInit = {};
    let aggregateTeamlead = {};
    let aggregateSalesInit = {};
    let aggregateSales = {};
    listProject.map((item) => {
      aggregateProject = { ...aggregateProject, [item]: 0 };
    });
    listCampaign.map((item) => {
      aggregateCampaign = { ...aggregateCampaign, [item]: 0 };
    });
    listStatusCode.map((item) => {
      aggregateStatusCode = { ...aggregateStatusCode, [item]: 0 };
    });
    listSupTag.map((item) => {
      aggregateSupInit = { ...aggregateSupInit, [item]: 0 };
    });
    listTeamleadTag.map((item) => {
      aggregateTeamleadInit = { ...aggregateTeamleadInit, [item]: 0 };
    });
    listSalesTag.map((item) => {
      aggregateSalesInit = { ...aggregateSalesInit, [item]: 0 };
    });
    results.map((result) => {
      listProject.map((item) => {
        if (result.project === item) {
          aggregateProject[item] += 1;
        }
      });
      listCampaign.map((item) => {
        if (result.campaign === item) {
          aggregateCampaign[item] += 1;
        }
      });
      listStatusCode.map((item) => {
        if (result.statusCode === item) {
          aggregateStatusCode[item] += 1;
        }
      });
      if (!result.supervisorTag) {
        aggregateSupInit[null] += 1;
        aggregateSup[null] = aggregateSupInit[null] || 0;
      }
      if (!result.teamleadTag) {
        aggregateTeamleadInit[null] += 1;
        aggregateTeamlead[null] = aggregateTeamleadInit[null] || 0;
      }
      if (!result.salesTag) {
        aggregateSalesInit[null] += 1;
        aggregateSales[null] = aggregateSalesInit[null] || 0;
      }
      listSupTag.map((item) => {
        if (
          result.supervisorTag &&
          item &&
          result.supervisorTag.toString() === item.toString()
        ) {
          aggregateSupInit[item] += 1;
          aggregateSup[result.supervisorTag] = aggregateSupInit[item];
        }
      });
      listTeamleadTag.map((item) => {
        if (
          result.teamleadTag &&
          item &&
          result.teamleadTag.toString() === item.toString()
        ) {
          aggregateTeamleadInit[item] += 1;
          aggregateTeamlead[result.teamleadTag] = aggregateTeamleadInit[item];
        }
      });
      listSalesTag.map((item) => {
        if (
          result.salesTag &&
          item &&
          result.salesTag.toString() === item.toString()
        ) {
          aggregateSalesInit[item] += 1;
          aggregateSales[result.salesTag] = aggregateSalesInit[item];
        }
      });
    });
    // console.log('entries: ', Object.entries(aggregateSup))
    aggregateProject = Object.fromEntries(
      Object.entries(aggregateProject).sort((a, b) => b[1] - a[1])
    );
    aggregateCampaign = Object.fromEntries(
      Object.entries(aggregateCampaign).sort((a, b) => b[1] - a[1])
    );
    aggregateStatusCode = Object.fromEntries(
      Object.entries(aggregateStatusCode).sort((a, b) => b[1] - a[1])
    );
    aggregateSup = Object.fromEntries(
      Object.entries(aggregateSup).sort((a, b) => b[1] - a[1])
    );
    aggregateTeamlead = Object.fromEntries(
      Object.entries(aggregateTeamlead).sort((a, b) => b[1] - a[1])
    );
    aggregateSales = Object.fromEntries(
      Object.entries(aggregateSales).sort((a, b) => b[1] - a[1])
    );
    aggregateSup = { null: aggregateSup[null], ...aggregateSup };
    aggregateTeamlead = { null: aggregateTeamlead[null], ...aggregateTeamlead };
    aggregateSales = { null: aggregateSales[null], ...aggregateSales };
    const data = {
      role,
      total,
      count: results.length,
      listProject,
      listBank,
      listCampaign,
      listStatusCode,
      data: {
        aggregateProject,
        aggregateCampaign,
        aggregateStatusCode,
        aggregateSup,
        aggregateTeamlead,
        aggregateSales,
      },
    };
    // console.log({data})
    res
      .status(200)
      .json({ success: true, message: "get dashboard successful", data });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
    // next(error);
  }
};
const getPerformanceSup = async (req, res) => {
  try {
    const { role, id } = req.decode;
    const user = await UserModel.findById(id).populate("company").lean().exec();

    // caculate time
    const hours = new Date().getHours() + 7;
    console.log({ hours });
    const arrayTimes = new Array(24).fill().map((item, index) => {
      return {
        [hours - index >= 0 ? hours - index : 24 + (hours - index)]:
          new Date().setHours(hours - 7, 0, 0) - index * 60 * 60 * 1000,
        parse: new Date(
          new Date().setHours(hours - 7, 0, 0) - index * 60 * 60 * 1000
        ).toISOString(),
      };
    });
    // let proccessInit = {};
    // arrayTimes.map((item) => {
    //   const key = Object.keys(item)[0];
    //   proccessInit[key] = 0;
    // });

    const companyTag = user.company._id.toString();
    const headTag = id;
    const ASMTag = id;
    const supervisorTag = id;
    const teamleadTag = id;
    const salesTag = id;
    // console.log({ project });
    const { filters } = getParams(req);
    const lastFilters = {
      headTag: req.query.headTag || "",
      ASMTag: req.query.ASMTag || "",
      supervisorTag: req.query.supervisorTag || "",
      teamleadTag: req.query.teamleadTag || "",
      salesTag: req.query.salesTag || "",
      supervisorTagName: req.query.supervisorTagName || "",
      teamleadTagName: req.query.teamleadTagName || "",
      salesTagName: req.query.salesTagName || "",
      project: req.query.project || "",
      campaign: req.query.campaign || "",
      statusCode: req.query.statusCode || "",
      createdAt: {
        $gte: new Date(arrayTimes[23][Object.keys(arrayTimes[23])[0]]),
      },
    };
    // console.log("+++++++ filter: ", filter);
    let filterPlus = {};

    if (role === "admin") {
      filterPlus = { companyTag };
    }
    if (role === "head") {
      filterPlus = { headTag };
    }
    if (role === "ASM") {
      filterPlus = { ASMTag };
    }
    if (role === "supervisor") {
      filterPlus = { supervisorTag };
    }
    if (role === "teamlead") {
      filterPlus = { teamleadTag };
    }
    if (role === "sales") {
      filterPlus = { salesTag };
    }

    // // req to worker
    // let dataCalc = {}
    // let dataError = {}
    // const requestConfig = {
    //   method: "post",
    //   url: `http://${WORKER_HOST}:${WORKER_PORT}/worker/crm/calcPerformanceSup`,
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   data: {lastFilters, filterPlus, filters, arrayTimes},
    // }
    // await axios(requestConfig)
    // .then((res)=>{
    //   console.log('data res: ', res.data)
    //   dataCalc = res.data.data
    // })
    // .catch((error)=>{
    //   console.log(error.response.data)
    //   dataError = error.response.data
    // })
    // if (Object.keys(dataError).length!==0) throw new Error(dataError.message)

    const listSupTag = await CustomerModel.distinct("supervisorTag", {
      ...filterPlus,
      ...filters,
    });
    const total = await CustomerModel.countDocuments(filterPlus);
    const results = multiFilter(fetchCustomers, {
      ...filterPlus,
      ...lastFilters,
    });
    // console.log({results})
    // const result = await CustomerModel.find(filterPlus)
    let performanceSup = {};
    for (const result of results) {
      for (const item of listSupTag) {
        if (
          item &&
          result.supervisorTag &&
          result.supervisorTag.toString() === item.toString()
        ) {
          for (const time of arrayTimes) {
            if (
              new Date(result.createdAt) >=
                new Date(time[Object.keys(time)[0]]) &&
              new Date(result.createdAt) <
                new Date(time[Object.keys(time)[0]] + 60 * 60 * 1000)
            ) {
              const prop = Object.keys(time)[0].toString();
              performanceSup[item.toString()] = {
                ...performanceSup[item.toString()],
                [prop]:
                  performanceSup &&
                  performanceSup[item.toString()] &&
                  performanceSup[item.toString()][prop]
                    ? performanceSup[item.toString()][prop] + 1
                    : 1,
              };
            } else {
              const prop = Object.keys(time)[0].toString();
              performanceSup[item.toString()] = {
                ...performanceSup[item.toString()],
                [prop]:
                  performanceSup &&
                  performanceSup[item.toString()] &&
                  performanceSup[item.toString()][prop]
                    ? performanceSup[item.toString()][prop]
                    : 0,
              };
            }
          }
        }
      }
    }
    const data = {
      role,
      total,
      count: results.length,
      listSupTag,
      data: {
        performanceSup,
      },
    };
    // console.log({data})
    res.status(200).json({
      success: true,
      message: "get dashboard successful",
      data,
    });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
    // next(error);
  }
};
const getPerformanceTeam = async (req, res) => {
  try {
    const { role, id } = req.decode;
    const user = await UserModel.findById(id).populate("company").lean().exec();

    // caculate time
    const hours = new Date().getHours() + 7;
    const arrayTimes = new Array(24).fill().map((item, index) => {
      return {
        [hours - index >= 0 ? hours - index : 24 + (hours - index)]:
          new Date().setHours(hours - 7, 0, 0) - index * 60 * 60 * 1000,
        parse: new Date(
          new Date().setHours(hours - 7, 0, 0) - index * 60 * 60 * 1000
        ).toISOString(),
      };
    });

    const companyTag = user.company._id.toString();
    const headTag = id;
    const ASMTag = id;
    const supervisorTag = id;
    const teamleadTag = id;
    const salesTag = id;
    const { filters } = getParams(req);
    const lastFilters = {
      headTag: req.query.headTag || "",
      ASMTag: req.query.ASMTag || "",
      supervisorTag: req.query.supervisorTag || "",
      teamleadTag: req.query.teamleadTag || "",
      salesTag: req.query.salesTag || "",
      supervisorTagName: req.query.supervisorTagName || "",
      teamleadTagName: req.query.teamleadTagName || "",
      salesTagName: req.query.salesTagName || "",
      project: req.query.project || "",
      campaign: req.query.campaign || "",
      statusCode: req.query.statusCode || "",
      createdAt: {
        $gte: new Date(arrayTimes[23][Object.keys(arrayTimes[23])[0]]),
      },
    };
    let filterPlus = {};
    if (role === "admin") {
      filterPlus = { companyTag };
    }
    if (role === "head") {
      filterPlus = { headTag };
    }
    if (role === "ASM") {
      filterPlus = { ASMTag };
    }
    if (role === "supervisor") {
      filterPlus = { supervisorTag };
    }
    if (role === "teamlead") {
      filterPlus = { teamleadTag };
    }
    if (role === "sales") {
      filterPlus = { salesTag };
    }

    // // req to worker
    // let dataCalc = {}
    // let dataError = {}
    // const requestConfig = {
    //   method: "post",
    //   url: `http://${WORKER_HOST}:${WORKER_PORT}/worker/crm/calcPerformanceTeam`,
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   data: {lastFilters, filterPlus, filters, arrayTimes},
    // }
    // await axios(requestConfig)
    // .then((res)=>{
    //   console.log('data res: ', res.data)
    //   dataCalc = res.data.data
    // })
    // .catch((error)=>{
    //   console.log(error.response.data)
    //   dataError = error.response.data
    // })
    // if (Object.keys(dataError).length!==0) throw new Error(dataError.message)

    const listTeamleadTag = await CustomerModel.distinct("teamleadTag", {
      ...filterPlus,
      ...filters,
    });
    const total = await CustomerModel.countDocuments(filterPlus);
    const results = multiFilter(fetchCustomers, {
      ...filterPlus,
      ...lastFilters,
    });
    let performanceTeam = {};
    for (const result of results) {
      for (const item of listTeamleadTag) {
        if (
          item &&
          result.teamleadTag &&
          result.teamleadTag.toString() === item.toString()
        ) {
          for (const time of arrayTimes) {
            if (
              new Date(result.createdAt) >=
                new Date(time[Object.keys(time)[0]]) &&
              new Date(result.createdAt) <
                new Date(time[Object.keys(time)[0]] + 60 * 60 * 1000)
            ) {
              const prop = Object.keys(time)[0].toString();
              performanceTeam[item.toString()] = {
                ...performanceTeam[item.toString()],
                [prop]:
                  performanceTeam &&
                  performanceTeam[item.toString()] &&
                  performanceTeam[item.toString()][prop]
                    ? performanceTeam[item.toString()][prop] + 1
                    : 1,
              };
            } else {
              const prop = Object.keys(time)[0].toString();
              performanceTeam[item.toString()] = {
                ...performanceTeam[item.toString()],
                [prop]:
                  performanceTeam &&
                  performanceTeam[item.toString()] &&
                  performanceTeam[item.toString()][prop]
                    ? performanceTeam[item.toString()][prop]
                    : 0,
              };
            }
          }
        }
      }
    }
    const data = {
      role,
      total,
      count: results.length,
      listTeamleadTag,
      data: {
        performanceTeam,
      },
    };
    // console.log({data})
    res.status(200).json({
      success: true,
      message: "get dashboard successful",
      data,
    });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
    // next(error);
  }
};
const getPerformanceSales = async (req, res) => {
  try {
    const { role, id } = req.decode;
    const user = await UserModel.findById(id).populate("company").lean().exec();

    // caculate time
    const hours = new Date().getHours() + 7;
    const arrayTimes = new Array(24).fill().map((item, index) => {
      return {
        [hours - index >= 0 ? hours - index : 24 + (hours - index)]:
          new Date().setHours(hours - 7, 0, 0) - index * 60 * 60 * 1000,
        parse: new Date(
          new Date().setHours(hours - 7, 0, 0) - index * 60 * 60 * 1000
        ).toISOString(),
      };
    });
    let proccessInit = {};
    arrayTimes.map((item) => {
      // console.log(Object.keys(item)[0]);
      const key = Object.keys(item)[0];
      proccessInit[key] = 0;
    });

    const companyTag = user.company._id.toString();
    const headTag = id;
    const ASMTag = id;
    const supervisorTag = id;
    const teamleadTag = id;
    const salesTag = id;
    const { filters } = getParams(req);
    const lastFilters = {
      headTag: req.query.headTag || "",
      ASMTag: req.query.ASMTag || "",
      supervisorTag: req.query.supervisorTag || "",
      teamleadTag: req.query.teamleadTag || "",
      salesTag: req.query.salesTag || "",
      supervisorTagName: req.query.supervisorTagName || "",
      teamleadTagName: req.query.teamleadTagName || "",
      salesTagName: req.query.salesTagName || "",
      project: req.query.project || "",
      campaign: req.query.campaign || "",
      statusCode: req.query.statusCode || "",
      createdAt: {
        $gte: new Date(arrayTimes[23][Object.keys(arrayTimes[23])[0]]),
      },
    };
    let filterPlus = {};
    // console.log("+++++++ filter: ", filter);
    // if (role === "root") {
    //   filterPlus = {companyTag : '6507f241463ede9b95fa59c1'};
    // }

    if (role === "admin") {
      filterPlus = { companyTag };
    }
    if (role === "head") {
      filterPlus = { headTag };
    }
    if (role === "ASM") {
      filterPlus = { ASMTag };
    }
    if (role === "supervisor") {
      filterPlus = { supervisorTag };
    }
    if (role === "teamlead") {
      filterPlus = { teamleadTag };
    }
    if (role === "sales") {
      filterPlus = { salesTag };
    }

    // // req to worker
    // let dataCalc = {}
    // let dataError = {}
    // const requestConfig = {
    //   method: "post",
    //   url: `http://${WORKER_HOST}:${WORKER_PORT}/worker/crm/calcPerformanceSales`,
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   data: {lastFilters, filterPlus, filters, arrayTimes},
    // }
    // await axios(requestConfig)
    // .then((res)=>{
    //   console.log('data res: ', res.data)
    //   dataCalc = res.data.data
    // })
    // .catch((error)=>{
    //   console.log(error.response.data)
    //   dataError = error.response.data
    // })
    // if (Object.keys(dataError).length!==0) throw new Error(dataError.message)
    const listSalesTag = await CustomerModel.distinct("salesTag", {
      ...filterPlus,
      ...filters,
    });
    const total = await CustomerModel.countDocuments(filterPlus);
    const results = multiFilter(fetchCustomers, {
      ...filterPlus,
      ...lastFilters,
    });
    // console.log({results})
    // const result = await CustomerModel.find(filterPlus)
    let performanceSales = {};
    for (const result of results) {
      for (const item of listSalesTag) {
        if (
          item &&
          result.salesTag &&
          result.salesTag.toString() === item.toString()
        ) {
          for (const time of arrayTimes) {
            if (
              new Date(result.createdAt) >=
                new Date(time[Object.keys(time)[0]]) &&
              new Date(result.createdAt) <
                new Date(time[Object.keys(time)[0]] + 60 * 60 * 1000)
            ) {
              const prop = Object.keys(time)[0].toString();
              performanceSales[item.toString()] = {
                ...performanceSales[item.toString()],
                [prop]:
                  performanceSales &&
                  performanceSales[item.toString()] &&
                  performanceSales[item.toString()][prop]
                    ? performanceSales[item.toString()][prop] + 1
                    : 1,
              };
            } else {
              const prop = Object.keys(time)[0].toString();
              performanceSales[item.toString()] = {
                ...performanceSales[item.toString()],
                [prop]:
                  performanceSales &&
                  performanceSales[item.toString()] &&
                  performanceSales[item.toString()][prop]
                    ? performanceSales[item.toString()][prop]
                    : 0,
              };
            }
          }
        }
      }
    }
    const data = {
      role,
      total,
      count: results.length,
      listSalesTag,
      data: {
        performanceSales,
      },
    };
    res
      .status(200)
      .json({ success: true, message: "get dashboard successful", data });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
const getPerformanceAMPM = async (req, res) => {
  try {
    const { role, id } = req.decode;
    const user = await UserModel.findById(id).populate("company").lean().exec();

    // caculate time
    const gteDate = req.query.gteDate;
    const startTime = new Date(gteDate);
    const arrayTimes = new Array(24).fill().map((item, index) => {
      return {
        [index]:
          new Date(startTime).setHours(-7, 0, 0) + index * 60 * 60 * 1000,
        parse: new Date(
          new Date(startTime).setHours(-7, 0, 0) + index * 60 * 60 * 1000
        ).toISOString(),
      };
    });
    let proccessInit = {};
    arrayTimes.map((item) => {
      // console.log(Object.keys(item)[0]);
      const key = Object.keys(item)[0];
      proccessInit[key] = 0;
    });

    // console.log({ arrayTimes, proccessInit });

    const companyTag = user.company._id.toString();
    const headTag = id;
    const ASMTag = id;
    const supervisorTag = id;
    const teamleadTag = id;
    const salesTag = id;
    const { filters, options } = getParams(req);
    const filter = {
      headTag: req.query.headTag || "",
      ASMTag: req.query.ASMTag || "",
      supervisorTag: req.query.supervisorTag || "",
      teamleadTag: req.query.teamleadTag || "",
      salesTag: req.query.salesTag || "",
      supervisorTagName: req.query.supervisorTagName || "",
      teamleadTagName: req.query.teamleadTagName || "",
      salesTagName: req.query.salesTagName || "",
      project: req.query.project || "",
      campaign: req.query.campaign || "",
      statusCode: req.query.statusCode || "",
    };
    // console.log("+++++++ filter: ", filter);
    let filterPlus = {};
    // if (role === "root") {
    //   filterPlus = {companyTag : '6507f241463ede9b95fa59c1'};
    // }

    if (role === "admin") {
      filterPlus = { companyTag };
    }
    if (role === "head") {
      filterPlus = { headTag };
    }
    if (role === "ASM") {
      filterPlus = { ASMTag };
    }
    if (role === "supervisor") {
      filterPlus = { supervisorTag };
    }
    if (role === "teamlead") {
      filterPlus = { teamleadTag };
    }
    if (role === "sales") {
      filterPlus = { salesTag };
    }

    // console.log("length: ", fetchCustomers.length);
    const listTeamleadTag = await CustomerModel.distinct("teamleadTag", {
      ...filterPlus,
      ...filters,
    });
    const total = await CustomerModel.countDocuments(filterPlus);
    const results = multiFilter(fetchCustomers, { ...filterPlus, ...filter });
    // console.log({results})
    // const result = await CustomerModel.find(filterPlus)
    let performanceAMPM = {};
    arrayTimes.map((time) => {
      performanceAMPM[Object.keys(time)[0].toString()] = 0;
    });
    results.map((result) => {
      arrayTimes.map((time) => {
        if (
          new Date(result.createdAt) >= new Date(time[Object.keys(time)[0]]) &&
          new Date(result.createdAt) <
            new Date(time[Object.keys(time)[0]] + 60 * 60 * 1000)
        ) {
          const prop = Object.keys(time)[0].toString();
          performanceAMPM = {
            ...performanceAMPM,
            [prop]:
              performanceAMPM && performanceAMPM[prop]
                ? performanceAMPM[prop] + 1
                : 1,
          };
        }
      });
    });
    const data = {
      role,
      total,
      count: results.length,
      limit: options.limit,
      page: options.skip + 1,
      listTeamleadTag,
      data: {
        performanceAMPM,
      },
    };
    // console.log({data})
    res
      .status(200)
      .json({ success: true, message: "get performanceAMPM successful", data });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
    // next(error);
  }
};

const getCustomerList = async (req, res) => {
  try {
    const { role, id } = req.decode;
    const user = await UserModel.findById(id).populate("company").lean().exec();
    // console.log({ role, id, user });

    const companyTag = user?.company;
    const headTag = id;
    const ASMTag = id;
    const supervisorTag = id;
    const teamleadTag = id;
    const salesTag = id;
    const project = req.query.project;
    const { filters, options } = getParams(req);
    let filterPlus = {};
    let filterWithProject = project ? { project } : {};
    if (role === "root") {
      filterPlus = {};
    }

    if (role === "admin") {
      filterPlus = { companyTag };
      filterWithProject = project ? { companyTag, project } : { companyTag };
    }
    if (role === "head") {
      filterPlus = { headTag };
      filterWithProject = project ? { headTag, project } : { headTag };
    }
    if (role === "ASM") {
      filterPlus = { ASMTag };
      filterWithProject = project ? { ASMTag, project } : { ASMTag };
    }
    if (role === "supervisor") {
      filterPlus = { supervisorTag };
      filterWithProject = project
        ? { supervisorTag, project }
        : { supervisorTag };
    }
    if (role === "teamlead") {
      filterPlus = { teamleadTag };
      filterWithProject = project ? { teamleadTag, project } : { teamleadTag };
    }
    if (role === "sales") {
      filterPlus = { salesTag };
      filterWithProject = project ? { salesTag, project } : { salesTag };
    }
    const result = await CustomerModel.find(
      { ...filters, ...filterPlus },
      null,
      options
    )
      .populate("salesTag", ["name"])
      .populate("teamleadTag", ["name"])
      .populate("supervisorTag", ["name"])
      .populate("user", ["name"])
      .populate("autocallCampaign", ["name"]);
    const listImportFile = await CustomerModel.distinct(
      "importFile",
      filterPlus
    );
    const listProject = await CustomerModel.distinct("project", filterPlus);
    const listBank = await CustomerModel.distinct("linkCard.bank", {
      ...filters,
      ...filterPlus,
    });
    const listCampaign = await CustomerModel.distinct(
      "campaign",
      filterWithProject
    );
    const listStatusCode = await CustomerModel.distinct(
      "statusCode",
      filterWithProject
    );
    const listStatusAutocall = await CustomerModel.distinct(
      "autocallStatus",
      filterWithProject
    );
    const total = await CustomerModel.countDocuments({
      ...filters,
      ...filterPlus,
    });
    const data = {
      role,
      total,
      count: result.length,
      limit: options.limit,
      page: options.skip + 1,
      listImportFile,
      listProject,
      listBank,
      listCampaign,
      listStatusCode,
      listStatusAutocall,
      data: result,
    };
    // console.log({data})
    res
      .status(200)
      .json({ success: true, message: "get list successful", data });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
    // next(error);
  }
};
const getTaskList = async (req, res) => {
  try {
    const { role, id } = req.decode;
    const user = await UserModel.findById(id).populate("company").lean().exec();
    // console.log({ role, id, user });

    const companyTag = user.company;
    const headTag = id;
    const ASMTag = id;
    const supervisorTag = id;
    const teamleadTag = id;
    const salesTag = id;
    const { filters, options } = getParams(req);
    const today = {
      $gte: new Date(new Date().setHours(-7, 0, 0)),
      $lte: new Date(
        new Date().setHours(-7, 0, 0) + 24 * 60 * 60 * 1000 - 1000
      ),
    }
    const expired = {
      $lte: new Date(new Date().getTime()),
    }
    const thisMonth = {
      $gte: new Date(
        new Date().setHours(-7, 0, 0) -
          (new Date().getDate() - 1) * 24 * 60 * 60 * 1000
      ),
      $lte: new Date(
        new Date(
          new Date(new Date().setMonth(new Date().getMonth() + 1)).setDate(
            new Date().getDate(1)
          )
        ).setHours(-7, 0, 0) - 1000
      ),
    }
    let filterPlus = {};

    if (req.query.flagged) {
      filters.flagged = true;
    }
    if (req.query.completed) {
      filters.status = req.query.completed;
    }

    if (req.query.reminderTime) {
      if (req.query.reminderTime === "today") {
        filters.reminderTime = today
      } else if (req.query.reminderTime === "thisMonth") {
        filters.reminderTime = thisMonth
      } else if (req.query.reminderTime === "expired") {
        filters.reminderTime = expired
      }
    }

    if (role === "root") {
      filterPlus = { ...filterPlus };
    }

    if (role === "admin") {
      filterPlus = { ...filterPlus, companyTag };
    }
    if (role === "head") {
      filterPlus = { ...filterPlus, headTag };
    }
    if (role === "ASM") {
      filterPlus = { ...filterPlus, ASMTag };
    }
    if (role === "supervisor") {
      filterPlus = { ...filterPlus, supervisorTag };
    }
    if (role === "teamlead") {
      filterPlus = { ...filterPlus, teamleadTag };
    }
    if (role === "sales") {
      filterPlus = { ...filterPlus, salesTag };
    }
    const result = await TaskModel.find({...filterPlus, ...filters}, null, options)
      .populate("customer")
      .populate("salesTag", ["name"])
      .populate("teamleadTag", ["name"])
      .populate("supervisorTag", ["name"])
      .populate("user", ["userName", "name"]);

    const total = await TaskModel.countDocuments(filterPlus);
    const countToday = await TaskModel.countDocuments({...filterPlus, reminderTime: today, status: "Pending"});
    const countThismonth = await TaskModel.countDocuments({...filterPlus, reminderTime: thisMonth, status: "Pending"});
    const countCompleted = await TaskModel.countDocuments({...filterPlus, ...filters, status: "Done"});
    const countExpired = await TaskModel.countDocuments({...filterPlus, reminderTime: expired, status: "Pending"});
    const countFlagged = await TaskModel.countDocuments({...filterPlus, flagged: true});
    const data = {
      role,
      countCompleted,
      countExpired,
      countFlagged,
      countToday,
      countThismonth,
      total,
      count: result.length,
      limit: options.limit,
      page: options.skip + 1,
      data: result,
    };
    // console.log({data})
    res
      .status(200)
      .json({ success: true, message: "get list successful", data });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
    // next(error);
  }
};

const customerInfo = async (req, res) => {
  // console.log(req.decode)
  // const { id } = req.decode;
  try {
    const _id = req.body.id;
    const customer = await CustomerModel.findById(_id)
      .populate("salesTag", ["name"])
      .populate("teamleadTag", ["name"])
      .populate("supervisorTag", ["name"])
      .populate("user", ["name"]);
    const data = {customer} ;
    res
      .status(200)
      .json({ success: true, message: "Find customer by _id is ok", data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const uploadCustomer = async (req, res) => {
  try {
    const { id, role } = req.decode;
    const userAction = await UserModel.findById(id).populate("company");
    const companyTag = userAction.company._id;
    // const userAction = await UserModel.findById(id);
    let permission = [];
    if (userAction.permission.default) {
      permission = getRule(userAction.company.rule[role]);
    } else if (!userAction.permission.default) {
      permission = getRule(userAction.permission.rule);
    }
    if (!permission.includes("importData")) throw new Error("Not permission");
    const filePath = req.file.path;
    // console.log({ filePath })
    const data = await readExcel(filePath);
    await fsPromises.unlink(filePath); // clear file => emty storage
    // console.log({ data });
    if (data[0].project === "link-card") {
      data.map(async (item) => {
        await CustomerModel.findByIdAndUpdate(item.id, {
          statusCode: String(item.statusCode),
          noteBank: String(item.noteBank),
        });
      });
      res.json({
        status: 200,
        success: true,
        message: "update data successful",
      });
    } else if (data[0].project === "CashLoan") {
      if (data[0].campaign === "SHB") {
        data.map(async (item) => {
          const dataUpdate = {
            product: item.product,
            project: item.project,
            campaign: item.campaign,
            F1Date: new Date(item.F1Date),
            dateLastF1: new Date(item.dateLastF1),
            disburedDate: item.disburedDate ? new Date(item.disburedDate) : "",
            appId: item.appId,
            name: item.name,
            statusCode: item.statusCode,
            ReqInsurance: item.ReqInsurance,
            disInsurance: item.disInsurance,
            DisAmount: item.DisAmount,
            tenure: item.tenure,
            salesCode: item.salesCode,
            customerProvice: item.customerProvice,
            contracts: item.contracts,
            companyTag: userAction.company,
          };
          const checked = await CustomerModel.findOne({ appId: item.appId });
          const user = await UserModel.findOne({ codeSHB: item.salesCode });
          if (user) {
            dataUpdate.salesTag = user._id;
            dataUpdate.teamleadTag = user.teamleadTag;
            dataUpdate.supervisorTag = user.supervisorTag;
            dataUpdate.ASMTag = user.ASMTag;
            dataUpdate.headTag = user.headTag;
            dataUpdate.ADPTag = user.ADPTag;
          }
          if (checked) {
            await CustomerModel.findOneAndUpdate(
              { appId: item.appId },
              dataUpdate
            );
          } else {
            await CustomerModel.create(dataUpdate);
          }
        });
        res.json({
          status: 200,
          success: true,
          message: "upload data successful",
        });
      }
      if (data[0].campaign === "MAFC") {
        data.map(async (item) => {
          const dataUpdate = {
            product: item.product,
            project: item.project,
            campaign: item.campaign,
            F1Date: new Date(item.F1Date),
            dateLastF1: new Date(item.dateLastF1),
            disburedDate: item.disburedDate ? new Date(item.disburedDate) : "",
            appId: item.appId,
            name: item.name,
            statusCode: item.statusCode,
            ReqInsurance: item.ReqInsurance,
            disInsurance: item.disInsurance,
            DisAmount: item.DisAmount,
            tenure: item.tenure,
            salesCode: item.salesCode,
            customerProvice: item.customerProvice,
            contracts: item.contracts,
            emi: item.emi,
            dueDay: item.dueDay,
            rejectedReason: item.rejectedReason,
            canDetail: item.canDetail,
            receiveAfter: item.receiveAfter,
            companyTag: userAction.company,
          };
          console.log({ dataUpdate });
          const checked = await CustomerModel.findOne({ appId: item.appId });
          const user = await UserModel.findOne({ codeMAFC: item.salesCode });
          if (user) {
            dataUpdate.salesTag = user._id;
            dataUpdate.teamleadTag = user.teamleadTag;
            dataUpdate.supervisorTag = user.supervisorTag;
            dataUpdate.ASMTag = user.ASMTag;
            dataUpdate.headTag = user.headTag;
            dataUpdate.ADPTag = user.ADPTag;
          }
          if (checked) {
            await CustomerModel.findOneAndUpdate(
              { appId: item.appId },
              dataUpdate
            );
          } else {
            await CustomerModel.create(dataUpdate);
          }
        });
        res.json({
          status: 200,
          success: true,
          message: "update data successful",
        });
      }
    } else {
      // @filter original data => find unique data
      const uniqueIdentification = data.filter((item, index) => {
        if (data[0].identification && data[1].identification) {
          const duplicated = data.findIndex((obj) => {
            return (
              JSON.stringify(obj.identification) ===
              JSON.stringify(item.identification)
            );
            // JSON.stringify(obj.phone) === JSON.stringify(item.phone);
          });
          return duplicated === index;
        } else {
          return true;
        }
      });
      const uniquePhone = uniqueIdentification.filter((item, index) => {
        const duplicated = uniqueIdentification.findIndex((obj) => {
          return JSON.stringify(obj.phone) === JSON.stringify(item.phone);
          // JSON.stringify(obj.phone) === JSON.stringify(item.phone);
        });
        return duplicated === index;
      });

      // @filter out items that are not in the DB
      let filtered = [];
      const importTime = `${moment.formatTime(Date.now())}`;
      Promise.all(
        uniquePhone.map(async (item) => {
          const filter = await CustomerModel.findOne({
            $or: [
              { identification: item.identification },
              { phone: item.phone },
            ],
            project: item.project,
          });
          if (filter === null) {
            item.importFile = `${item.campaign}-${importTime}`;
            item.companyTag = companyTag;
            item.user = id;
            if (role === "supervisor") item.supervisorTag = id;
            if (role === "teamlead") item.teamleadTag = id;
            filtered.push(item);
          }
        })
      )
        .then(async () => {
          // Insert new items
          await CustomerModel.insertMany(filtered);
          // console.log("Imported " + filtered.length + " items");
          res.status(200).json({
            success: true,
            message: `Upload successful, detected ${
              uniquePhone.length - filtered.length
            } duplicate items in database - ${
              data.length - uniquePhone.length
            } duplicate items in original file ==> ${
              filtered.length
            } items have been inserted`,
            data: filtered,
          });
        })
        .catch((error) => {
          console.log({ error });
        });
    }
    // upadateFetchCustomers();
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: `Upload failed - ${error.message}` });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.body;
    const data = req.body;
    console.log("body: ",data);
    let { statusCode, action, status } = data;
    const firstData = await CustomerModel.findById(id);
    if (!status) status = firstData.status;
    if (!action) action = firstData.action;
    if (!statusCode) statusCode = firstData.statusCode;
    const {
      actionCode,
      resulfCode,
      callFrom,
      callResult,
      time1,
      time2,
      time3,
      note,
    } = action;
    let { history } = firstData;
    const firstStatusCode = firstData.statusCode;
    const firstActionCode = firstData.action.actionCode;
    const firstResulfCode = firstData.action.resulfCode;
    const firstCallFrom = firstData.action.callFrom;
    const firstCallResulft = firstData.action.callResult;
    const firstTime1 = firstData.action.time1;
    const firstTime2 = firstData.action.time2;
    const firstTime3 = firstData.action.time3;
    const firstNote = firstData.action.note;
    const firstStatus = firstData.status;

    if (statusCode !== firstStatusCode)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `Trạng thái: ${firstStatusCode} => ${statusCode}`,
        },
        ...history,
      ];

    // console.log({ action, status, statusCode });
    if (note !== firstNote)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `Note: ${firstNote ? firstNote : "none"} => ${note}`,
        },
        ...history,
      ];
    if (actionCode !== firstActionCode)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `Action Code: ${
            firstActionCode ? firstActionCode : "none"
          } => ${actionCode}`,
        },
        ...history,
      ];
    if (resulfCode !== firstResulfCode)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `Result Code: ${
            firstResulfCode ? firstResulfCode : "none"
          } => ${resulfCode}`,
        },
        ...history,
      ];
    if (callFrom !== firstCallFrom)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `Call From: ${
            firstCallFrom ? firstCallFrom : "none"
          } => ${callFrom}`,
        },
        ...history,
      ];
    if (callResult !== firstCallResulft)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `Call Result: ${
            firstCallResulft ? firstCallResulft : "none"
          } => ${callResult}`,
        },
        ...history,
      ];
    if (time1 !== firstTime1)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `lần 1 ${firstTime1 ? firstTime1 : "none"} => ${time1}`,
        },
        ...history,
      ];
    if (time2 !== firstTime2)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `lần 2 ${firstTime2 ? firstTime2 : "none"} => ${time2}`,
        },
        ...history,
      ];
    if (time3 !== firstTime3)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `lần 3 ${firstTime3 ? firstTime3 : "none"} => ${time3}`,
        },
        ...history,
      ];
    if (status !== firstStatus)
      history = [
        {
          time: moment.formatTime(Date.now()),
          update: `Phân loại: ${firstStatus} => ${status}`,
        },
        ...history,
      ];
    const update = await CustomerModel.findByIdAndUpdate(id, {
      ...data,
      history,
      status,
    });
    // upadateFetchCustomers();
    res
      .status(200)
      .json({ success: true, message: "Update successful", data: update });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Update failed - ${error.message}` });
  }
};

const createCustomerReference = async (req, res) => {
  try {
    const { id, name, phone } = req.body;
    const create = await ReferenceModel.create({ name, phone, customerId: id });
    res
      .status(200)
      .json({ success: true, message: "Reference created", data: create });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Create failed - ${error.message}` });
  }
};

const updateCustomerReference = async (req, res) => {
  try {
    const { id, data } = req.body;
    // console.log({ id, data });
    const update = await ReferenceModel.findByIdAndUpdate(id, data);
    res
      .status(200)
      .json({ success: true, message: "Reference created", data: update });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Update failed - ${error.message}` });
  }
};

const countList = async (req, res) => {
  try {
    const count = await CustomerModel.countDocuments();
    res.status(200).json({
      success: true,
      message: "Count items is successful",
      data: count,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Count list failed - ${error.message}`,
    });
  }
};

const assignCustomer = async (req, res) => {
  const { role, id } = req.decode;
  // console.log({ role, _id })
  const { data, rule, selectId } = req.body;
  // console.log({ data, rule, selectId });
  try {
    if (!data) throw new Error("Can not find data");
    let update = [];
    if (rule === "collect") {
      data.sort((a, b) => b.collect - a.collect);
      if (role === "root" || role === "admin") {
        const users = await UserModel.find({ role: "supervisor" });
        data.map(async (obj, index) => {
          const userId = users[index % users.length];
          update.push(
            await CustomerModel.findByIdAndUpdate(obj._id, {
              supervisorTag: userId,
            })
          );
        });
      }
      if (role === "supervisor") {
        const users = await UserModel.find({
          $and: [{ role: "teamlead" }, { supervisorTag: id }],
        });
        data.map(async (obj, index) => {
          const userId = users[index % users.length];
          update.push(
            await CustomerModel.findByIdAndUpdate(obj._id, {
              teamleadTag: userId,
            })
          );
        });
      }
      if (role === "teamlead") {
        const users = await UserModel.find({
          $and: [{ role: "sales" }, { teamleadTag: id }],
        });
        data.map(async (obj, index) => {
          const userId = users[index % users.length];
          update.push(
            await CustomerModel.findByIdAndUpdate(obj._id, { salesTag: userId })
          );
        });
      }
    }
    if (rule === "select") {
      const userAction = await UserModel.findById(id).populate("company");
      let permission = [];
      if (userAction.permission.default) {
        permission = getRule(userAction.company.rule[role]);
      } else if (!userAction.permission.default) {
        permission = getRule(userAction.permission.rule);
      }
      if (!permission.includes("assignData")) {
        throw new Error("Not permission");
      } else {
        const user = await UserModel.findById(selectId);
        if (user.role === "head") {
          data.map(async (obj) => {
            update.push(
              await CustomerModel.findByIdAndUpdate(obj._id, {
                headTag: selectId,
              })
            );
          });
        } else if (user.role === "ASM") {
          data.map(async (obj) => {
            update.push(
              await CustomerModel.findByIdAndUpdate(obj._id, {
                ASMTag: selectId,
              })
            );
          });
        } else if (user.role === "supervisor") {
          data.map(async (obj) => {
            update.push(
              await CustomerModel.findByIdAndUpdate(obj._id, {
                supervisorTag: selectId,
              })
            );
          });
        } else if (user.role === "teamlead") {
          data.map(async (obj) => {
            update.push(
              await CustomerModel.findByIdAndUpdate(obj._id, {
                teamleadTag: selectId,
              })
            );
          });
        } else if (user.role === "sales") {
          data.map(async (obj) => {
            update.push(
              await CustomerModel.findByIdAndUpdate(obj._id, {
                salesTag: selectId,
              })
            );
          });
        }
      }
    }
    // upadateFetchCustomers();
    res
      .status(200)
      .json({ success: true, message: "Assign list is successful", update });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Assign list failed - ${error.message}`,
    });
  }
};

const revokeCustomer = async (req, res) => {
  const { id } = req.decode;
  const { role, data } = req.body;
  try {
    if (!data) throw new Error("Can not find campaign");
    let update = [];
    const userAction = await UserModel.findById(id).populate("company");
    let permission = [];
    if (userAction.permission.default) {
      permission = getRule(userAction.company.rule[role]);
    } else if (!userAction.permission.default) {
      permission = getRule(userAction.permission.rule);
    }
    if (!permission.includes("revokeData")) throw new Error("Not permission");
    if (role === "supervisor") {
      data.map(async (obj) => {
        update.push(
          await CustomerModel.findByIdAndUpdate(obj._id, {
            supervisorTag: null,
            teamleadTag: null,
            salesTag: null,
          })
        );
      });
    }
    if (role === "teamlead") {
      data.map(async (obj) => {
        update.push(
          await CustomerModel.findByIdAndUpdate(obj._id, {
            teamleadTag: null,
            salesTag: null,
          })
        );
      });
    }
    if (role === "sales") {
      data.map(async (obj) => {
        update.push(
          await CustomerModel.findByIdAndUpdate(obj._id, { salesTag: null })
        );
      });
    }
    // upadateFetchCustomers();
    res
      .status(200)
      .json({ success: true, message: "Revoke list is successful", update });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Revoke list failed - ${error.message}`,
    });
  }
};

const deleteImportFile = async (req, res) => {
  try {
    const { id, role } = req.decode;
    const { importFile } = req.body;
    if (!importFile) throw new Error("Can not find import-file");
    const userAction = await UserModel.findById(id).populate("company");
    let permission = [];
    if (userAction.permission.default) {
      permission = getRule(userAction.company.rule[role]);
    } else if (!userAction.permission.default) {
      permission = getRule(userAction.permission.rule);
    }
    if (!permission.includes("deleteImport")) throw new Error("Not permission");

    // assign start
    const data = await CustomerModel.find({ importFile });
    data.map(async (obj) => {
      await CustomerModel.findByIdAndDelete(obj._id);
    });
    // upadateFetchCustomers();
    res
      .status(200)
      .json({ success: true, message: "Delete list is successful" });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Delete list failed - ${error.message}`,
    });
  }
};

const createBank = async (req, res) => {
  try {
    const { name } = req.body;
    const create = await BankModel.create({ name });
    res
      .status(200)
      .json({ success: true, message: "Bank created", data: create });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Create failed - ${error.message}` });
  }
};
const createDashBoard = async (req, res) => {
  try {
    const { name, companyTag } = req.body;
    const create = await DashBoardModel.create({ name, companyTag });
    res
      .status(200)
      .json({ success: true, message: "DashBoard created", data: create });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Create failed - ${error.message}` });
  }
};

const createLinkCard = async (req, res) => {
  try {
    const { name, link, type, typeCard, bankId } = req.body;
    const create = await LinkCardModel.create({
      name,
      link: link.trim(),
      type,
      typeCard,
      bankId,
    });
    res.status(200).json({
      success: true,
      message: `Link card ${name} created`,
      data: create,
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Create failed - ${error.message}` });
  }
};

const updateLinkCard = async (req, res) => {
  try {
    const { id, status, name, link, image, updateStatus, content, typeCard } =
      req.body;
    if (updateStatus) {
      // console.log("INPUT-STATUS: ", req.body);
      const update = await LinkCardModel.findByIdAndUpdate(id, {
        status,
      });
      res.status(200).json({
        success: true,
        message: `Update link-card ${update.name} successful`,
        data: update,
      });
    } else {
      // console.log("input: ", req.body);
      const update = await LinkCardModel.findByIdAndUpdate(id, {
        name,
        link: link.trim(),
        image,
        content,
        typeCard,
      });
      res.status(200).json({
        success: true,
        message: `Update link-card ${update.name} successful`,
        data: update,
      });
    }
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Update failed - ${error.message}` });
  }
};

const deleteLinkCard = async (req, res) => {
  try {
    const { _id } = req.body;
    // console.log(req.body);
    const data = await LinkCardModel.findByIdAndDelete(_id);
    res.status(200).json({ success: true, message: `Link-card deleted`, data });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Delete failed - ${error.message}` });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id, role } = req.decode;
    const { listId } = req.body;

    const userAction = await UserModel.findById(id).populate("company");
    let permission = [];
    if (userAction.permission.default) {
      permission = getRule(userAction.company.rule[role]);
    } else if (!userAction.permission.default) {
      permission = getRule(userAction.permission.rule);
    }
    if (!permission.includes("deleteData")) throw new Error("Not permission");

    let listSuccess = [];
    if (role !== "root" && role !== "admin") {
      // let findReject = 0;
      for (const _id of listId) {
        const findLead = await CustomerModel.findById(_id).exec();
        const createdAtMs = new Date(findLead.createdAt).getTime();
        const dateNow = new Date().getTime();
        // console.log({ createdAtMs, dateNow });
        if (dateNow - createdAtMs < 24 * 60 * 60 * 1000) {
          // findReject = findReject + 1;
          listSuccess.push(_id);
        }
        for (const id of listSuccess) {
          // await CustomerModel.findByIdAndDelete(id)
          await CustomerModel.findByIdAndDelete(id).exec();
        }
      }
    } else {
      listId &&
        listId.map(async (_id) => {
          await CustomerModel.findByIdAndDelete(_id).exec();
        });
    }
    res.status(200).json({
      success: true,
      message: `${
        role === "admin" || role === "root" ? listId.length : listSuccess.length
      } lead was deleted`,
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: `Delete failed - ${error.message}` });
  }
};

const getLinkCardList = async (req, res) => {
  try {
    const { id } = req.decode;
    const { linkId } = req.query;
    const params = {};
    if (linkId) params._id = linkId;
    // console.log({ role, id });

    const user = await UserModel.findById(id);
    const bank = await BankModel.find();
    const linkcard = await LinkCardModel.find(params).populate("bankId", [
      "name",
    ]);

    const data = {
      user,
      bank,
      linkcard,
    };
    res
      .status(200)
      .json({ success: true, message: "get list successful", data });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
    // next(error);
  }
};
const findLinkCard = async (req, res) => {
  try {
    const { linkId } = req.body;
    const linkcard = await LinkCardModel.findById(linkId).populate("bankId", [
      "name",
    ]);

    const data = {
      linkcard,
    };
    res
      .status(200)
      .json({ success: true, message: "get list successful", data });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
    // next(error);
  }
};

const uploadPdf = async (req, res) => {
  try {
    const { id } = req.body;
    const filePath = req.file.path;
    // console.log({ filePath, req });
    await CustomerModel.findByIdAndUpdate(id, {
      pathFile: filePath,
    });
    // upadateFetchCustomers();
    res.status(200).json({ success: true, message: "upload file successful" });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
const uploadLinkcardImg = async (req, res) => {
  try {
    const { id } = req.body;
    const filePath = req.file.path;
    await LinkCardModel.findByIdAndUpdate(id, {
      image: filePath,
    });
    res.status(200).json({ success: true, message: "upload image successful" });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const downLoadPdf = async (req, res) => {
  try {
    const { id } = req.query;
    const customer = await CustomerModel.findById(id);
    const { pathFile } = customer;
    // console.log({ pathFile });
    res.download(pathFile);
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
const downLoadExel = async (req, res) => {
  try {
    const { role, id } = req.decode;
    // console.log({ role, id });
    const userAction = await UserModel.findById(id).populate("company");
    let permission = [];
    if (userAction.permission.default) {
      permission = getRule(userAction.company.rule[role]);
    } else if (!userAction.permission.default) {
      permission = getRule(userAction.permission.rule);
    }
    if (!permission.includes("exportData")) throw new Error("Not permission");
    const user = await UserModel.findById(id);
    const companyTag = user.company;
    const headTag = id;
    const ASMTag = id;
    const supervisorTag = id;
    const teamleadTag = id;
    const salesTag = id;
    // const project = req.query.project;
    // console.log({ project });
    const { filters, options } = getParams(req);
    let filterPlus = {};
    if (role === "root") {
      filterPlus = filters;
    }
    if (role === "admin") {
      filterPlus = {
        $and: [filters, { companyTag }],
      };
    }
    if (role === "head") {
      filterPlus = {
        $and: [filters, { headTag }],
      };
    }
    if (role === "ASM") {
      filterPlus = {
        $and: [filters, { ASMTag }],
      };
    }
    if (role === "supervisor") {
      filterPlus = {
        $and: [filters, { supervisorTag }],
      };
    }
    if (role === "teamlead") {
      filterPlus = {
        $and: [filters, { teamleadTag }],
      };
    }
    if (role === "sales") {
      filterPlus = {
        $and: [filters, { salesTag }],
      };
    }
    const result = await CustomerModel.find(filterPlus, null, options)
      .populate("salesTag", ["name", "userName", "status"])
      .populate("teamleadTag", ["name", "userName", "status"])
      .populate("supervisorTag", ["name", "userName", "status"])
      .populate("ASMTag", ["name", "userName", "status"])
      .populate("headTag", ["name", "userName", "status"])
      .populate("user", ["name"]);

    let dataExport = [];
    if (result[0].project === "link-card" || result[0].project === "LeadGen" || result[0].project === "TSACL") {
      result.map((item) => {
        const data = item;
        const latestData = {
          id: data.id,
          createDate: moment.formatTime(data.createdAt),
          upDate: moment.formatTime(data.updatedAt),
          name: data.name,
          identification: data.identification,
          phone: data.phone,
          statusCode: data.statusCode,
          campaign: data.campaign,
          bank: data.linkCard.bank,
          linkFile: data.pathFile
            ? `http://${domain}:${port}${apiPath}?id=${data.id}`
            : "",
          salesTag: data.salesTag?.name,
          userSales: data.salesTag?.userName,
          "Sales-Active": data.salesTag?.status,
          teamleadTag: data.teamleadTag?.name,
          userTeamlead: data.teamleadTag?.userName,
          "Teamlead-Active": data.teamleadTag?.status,
          supervisorTag: data.supervisorTag?.name,
          userSubpervisor: data.supervisorTag?.userName,
          "Supervisor-Active": data.supervisorTag?.status,
          ASMTag: data.ASMTag?.name,
          headTag: data.headTag?.name,
          project: data.project,
          note: data.action?.note,
          "status-Sales": data.status,
          noteBank: data.noteBank,
          "Trạng thái Autocall": data.autocallStatus,
        };
        dataExport.push(latestData);
        // console.log({data, latestData})
      });
    } else if (result[0].project === "New Card") {
      result.map((item) => {
        const data = item;
        const latestData = {
          id: data.id,
          createDate: moment.formatTime(data.createdAt),
          upDate: moment.formatTime(data.updatedAt),
          name: data.name,
          // identification: data.identification,
          phone: data.phone,
          statusCode: data.statusCode,
          campaign: data.campaign,
          // bank: data.linkCard.bank,
          linkFile: data.pathFile
            ? `http://${domain}:${port}${apiPath}?id=${data.id}`
            : "",
          salesTag: data.salesTag?.name,
          userSales: data.salesTag?.userName,
          "Sales-Active": data.salesTag?.status,
          teamleadTag: data.teamleadTag?.name,
          userTeamlead: data.teamleadTag?.userName,
          "Teamlead-Active": data.teamleadTag?.status,
          supervisorTag: data.supervisorTag?.name,
          userSubpervisor: data.supervisorTag?.userName,
          "Supervisor-Active": data.supervisorTag?.status,
          ASMTag: data.ASMTag?.name,
          headTag: data.headTag?.name,
          project: data.project,
          note: data.action?.note,
          "status-Sales": data.status,
          // noteBank: data.noteBank,
        };
        dataExport.push(latestData);
        // console.log({data, latestData})
      });
    } else if (result[0].project === "CashLoan") {
      result.map((item) => {
        const data = item;
        const latestData = {
          "Dự án": data.project,
          "Chiến dịch": data.campaign,
          "Số Hợp Đồng": data.contracts,
          "Tên KH": data.name,
          "Tỉnh Thành": data.customerProvice,
          "Sản Phẩm": data.product,
          "Mã hồ sơ": data.appId,
          "Ngày Giải Ngân": data.disburedDate
            ? moment.formatTime(data.disburedDate)
            : "",
          "Ngày Submit App": data.F1Date ? moment.formatTime(data.F1Date) : "",
          "Ngày Cập Nhật": data.dateLastF1
            ? moment.formatTime(data.dateLastF1)
            : "",
          "Số Tiền Đề Nghị": data.ReqInsurance,
          "Số Tiền Được Duyệt": data.disInsurance,
          "Tổng số Tiền Vay Phê Duyệt": data.DisAmount,
          "Kỳ Hạn Phê Duyệt": data.tenure,
          "Trạng thái": data.statusCode,
          EMI: data.emi,
          DUEDAY: data.dueDay,
          "Rejected Reason": data.rejectedReason,
          "Cancel Detail": data.canDetail,
          "Receive After": data.receiveAfter
            ? moment.formatTime(data.receiveAfter)
            : "",
          "Mã sale": data.salesCode,
          salesTag: data.salesTag?.name,
          userSales: data.salesTag?.userName,
          "Sales-Active": data.salesTag?.status,
          teamleadTag: data.teamleadTag?.name,
          userTeamlead: data.teamleadTag?.userName,
          "Teamlead-Active": data.teamleadTag?.status,
          supervisorTag: data.supervisorTag?.name,
          userSubpervisor: data.supervisorTag?.userName,
          "Supervisor-Active": data.supervisorTag?.status,
          ASMTag: data.ASMTag?.name,
          headTag: data.headTag?.name,
        };
        dataExport.push(latestData);
      });
    }
    const pathFile = await exportExcel(dataExport);
    res.download(pathFile);
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
const downLoadExelTemplate = async (req, res) => {
  try {
    const { role, id } = req.decode;
    // console.log({ role, id });
    const userAction = await UserModel.findById(id).populate("company");
    let permission = [];
    if (userAction.permission.default) {
      permission = getRule(userAction.company.rule[role]);
    } else if (!userAction.permission.default) {
      permission = getRule(userAction.permission.rule);
    }
    if (!permission.includes("exportData")) throw new Error("Not permission");

    let dataExport = [];
    if (req.query.project === "TSACL") {
      dataExport = [
        {
          "Dự án": "TSACL",
          "Chiến dịch": "Đặt tên tự do",
          "Tên KH": "Nguyễn Văn A",
          "SDT KH": "0903238238",
          CMND: "123456789",
        },
        {
          "Dự án": "TSACL",
          "Chiến dịch": "Đặt tên tự do",
          "Tên KH": "Trần Thanh B",
          "SDT KH": "0918238239",
          CMND: "123456780",
        },
      ];
    } else if (req.query.project === "New Card") {
      dataExport = [
        {
          "Dự án": "New Card",
          "Chiến dịch": "Đặt tên tự do",
          "Tên KH": "Nguyễn Văn A",
          "SDT KH": "0903238238",
          CMND: "123456789",
        },
        {
          "Dự án": "New Card",
          "Chiến dịch": "Đặt tên tự do",
          "Tên KH": "Trần Thanh B",
          "SDT KH": "0918238239",
          CMND: "123456780",
        },
      ];
    } else if (req.query.project === "XKLD") {
      dataExport = [
        {
          "Dự án": "XKLD",
          "Chiến dịch": "Đặt tên tự do",
          "Tên KH": "Nguyễn Văn A",
          "SDT KH": "0903238238",
          CMND: "123456789",
          "Địa chỉ TT" : "HCM"
        },
        {
          "Dự án": "XKLD",
          "Chiến dịch": "Đặt tên tự do",
          "Tên KH": "Trần Thanh B",
          "SDT KH": "0918238239",
          CMND: "123456780",
          "Địa chỉ TT" : "Hà Nội"
        },
      ];
    }
    const pathFile = await exportExcel(dataExport);
    res.download(pathFile);
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

//hot fix manual
const updateAllCustomer = async (req, res) => {
  try {
    const action = req.body.action;
    if (action) {
      const customers = await CustomerModel.find({ project: "link-card" })
        .lean()
        .exec();
      // const linkCards = await LinkCardModel.find().exec();
      customers.map(async (customer) => {
        // let type = "";
        // for (const linkCard of linkCards) {
        //   if (linkCard.name === customer.campaign) {
        //     type = linkCard.typeCard;
        //   }
        // }
        // const id = customer.headTag
        // console.log('headTag: ', id)
        // await CustomerModel.findByIdAndUpdate(customer._id, {
        //   companyTag: "6507f241463ede9b95fa59c1",
        // });
        // if (customer.headTag == "65373edb89674034c41b84f8") {
        //   await CustomerModel.findByIdAndUpdate(customer._id, {
        //     companyTag: "6507f241463ede9b95fa59c1",
        //   });
        console.log(customer);
        // }
      });
    }
    res.status(200).json({ success: true, message: "update succesfull" });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  getDashboard,
  getPerformanceSup,
  getPerformanceTeam,
  getPerformanceSales,
  getPerformanceAMPM,
  getCustomerList,
  customerInfo,
  creatCustomer,
  uploadCustomer,
  assignCustomer,
  updateCustomer,
  countList,
  createCustomerReference,
  updateCustomerReference,
  revokeCustomer,
  deleteImportFile,
  findCompany,
  createLinkCard,
  getLinkCardList,
  updateLinkCard,
  createBank,
  updateTask,
  createDashBoard,
  createCustomerLinkCard,
  findLinkCard,
  deleteLinkCard,
  uploadPdf,
  downLoadPdf,
  downLoadExel,
  downLoadExelTemplate,
  uploadLinkcardImg,
  deleteCustomer,
  createTask,
  getTaskList,
  updateAllCustomer,
};
