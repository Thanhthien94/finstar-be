import {
  UserModel,
  CompanyModel,
  AccessibilityModel,
  RoleModel,
  SipModel,
  PbxModel,
  TelcoModel,
  BillModel,
  CDRModel,
} from "../../controllers/mongodb/index.js";
// import { CompanyModel } from "../../controllers/mongodb/models/Company.js";
import { getParams } from "../../util/getParams/index.js";
import argon2 from "argon2";
import auth from "../../util/authentication/auth.js";
import { exportExcel } from "../../util/excel/excel.js";
import moment from "../../util/monent/moment.js";

const { generateToken } = auth;
const createUser = async (req, res) => {
  let {
    username,
    password,
    firstname,
    lastname,
    phone,
    company,
    hometown,
    identification,
    role,
    type,
    title,
  } = req.body;
  //simple validation
  console.log(req.body);
  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Missing username or password" });
  }
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    const user = await UserModel.findOne({ username });
    if (user) {
      throw new Error("User already exists");
    }
    //All good
    const hashedPassword = await argon2.hash(password);

    // console.log({hashedPassword})
    const dataCreate = {
      username,
      password: hashedPassword,
      firstname,
      lastname,
      email: username,
      phone,
      company,
      hometown,
      identification,
      role,
      type,
      title,
    };
    const newUser = await UserModel.create(dataCreate);
    res
      .status(200)
      .json({ success: true, message: "User is created", data: newUser });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const id = req.decode.id;
    const { newPassword } = req.body;
    const user = await UserModel.findById(id);
    if (!user) {
      throw new Error("user not found");
    }
    const hashedPassword = await argon2.hash(newPassword);
    await UserModel.findByIdAndUpdate(id, { password: hashedPassword });
    res.status(200).json({ success: true, message: "New password is changed" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const resetPassword = async (req, res) => {
  try {
    const id = req.body._id;
    // const role = req.decode.role;
    console.log("id: ", id);

    const newPassword = "12345678";
    const user = await UserModel.findById(id);
    if (!user) {
      throw new Error("user not found");
    }
    const hashedPassword = await argon2.hash(newPassword);
    await UserModel.findByIdAndUpdate(id, { password: hashedPassword });
    res.status(200).json({ success: true, message: "New password is changed" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getListUsers = async (req, res) => {
  try {
    const { role, _id } = req.decode;
    let filter = {};
    const user = await UserModel.findById(_id);
    if (!role.includes("root")) filter = { company: user.company };
    const { filters, options } = getParams(req);
    let filterPlus = {};
    const users = await UserModel.find(
      { $and: [filters, filter] },
      null,
      options
    )
      .populate("company")
      .populate("usersTag")
      .populate("role")
      .populate("sipAccount");
    // console.log("user: ", users);
    const total = await UserModel.countDocuments(filterPlus);
    const count = users.length;
    res.status(200).json({
      success: true,
      message: "Get list is successful",
      data: { total, count, users },
    });
  } catch (error) {
    console.log({ error });
    res.status(400).json({ success: false, message: error.message });
  }
};
const getUser = async (req, res) => {
  try {
    let user = {};
    if (req.query.id) {
      const id = req.query.id;
      user = await UserModel.findById(id).populate("company");
    } else {
      const { id } = req.decode;
      user = await UserModel.findById(id).populate("company");
    }
    res
      .status(200)
      .json({ success: true, message: "Get user is successful", data: user });
  } catch (error) {
    console.log("error: ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
const updateUser = async (req, res) => {
  try {
    // let user = {}
    const rolePermit = req.decode.role;
    // if (rolePermit !== "root" && rolePermit !== "admin")
    //   throw new Error("Not permission");
    const data = req.body;
    // console.log({ data });
    let {
      username,
      firstname,
      lastname,
      phone,
      company,
      hometown,
      identification,
      status,
      role,
      type,
      title,
      usersTag,
      sipAccount,
    } = data;
    const findUser = await UserModel.findOne({ username });
    if (!findUser?.role.includes("root"))
      throw new Error("Can not change user root");
    // console.log(findUser);
    if (!sipAccount) {
      await SipModel.findByIdAndUpdate(findUser?.sipAccount, {
        user: null,
        usersTag: null,
        company: null,
      });
    }
    if (sipAccount) {
      await SipModel.findByIdAndUpdate(sipAccount, {
        user: findUser._id,
        usersTag: usersTag || findUser.usersTag,
        company: company || findUser.company,
      });
    }
    if (status === "Locked") {
      await UserModel.findOneAndUpdate(
        { username },
        { status, refreshToken: null }
      );
    } else {
      await UserModel.findOneAndUpdate(
        { username },
        {
          firstname,
          lastname,
          phone,
          company,
          hometown,
          identification,
          status,
          role,
          type,
          title,
          sipAccount,
          usersTag,
        }
      );
    }
    res
      .status(200)
      .json({ success: true, message: "Update user is successful" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
    console.log(error);
  }
};
const deleteUser = async (req, res) => {
  try {
    if (req.decode.role !== "root" && req.decode.role !== "admin")
      throw new Error("Not permission");
    const { _id } = req.body;
    console.log({ _id });
    const user = await UserModel.findById(_id);
    if (user.role === "root") throw new Error("Can not delete user root");
    await UserModel.findByIdAndDelete(_id);
    res
      .status(200)
      .json({ success: true, message: "Delete user is successful" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const createCompany = async (req, res) => {
  const { role } = req.decode;
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    const { name } = req.body;
    if (!name) throw new Error("Chưa nhập tên công ty");
    const findCompany = await CompanyModel.findOne({ name });
    console.log({ findCompany });
    if (findCompany) throw new Error("Thông tin đã tồn tại");
    const company = await CompanyModel.create({ name });
    res
      .status(200)
      .json({ success: true, message: "Company created", data: company });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Create company failed: ${error.message}`,
    });
  }
};

const getCompanies = async (req, res) => {
  const { role, id } = req.decode;
  try {
    // if (role !== "root" && role !== "admin")
    //   throw new Error("User is not access");
    let filter = {};
    const user = await UserModel.findById(id);
    if (!role.includes("root")) throw new Error("User is not access");
    const data = await CompanyModel.find(filter);
    res.status(200).json({ success: true, message: "Company created", data });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Get companies failed ${error.message}`,
    });
  }
};
const updateCompanies = async (req, res) => {
  const { role } = req.decode;
  try {
    const { id, sipPrice, rule, color } = req.body;
    console.log("req.body: ", req.body);
    const { viettel, vinaphone, mobifone, others } = sipPrice;
    if (!viettel || !vinaphone || !mobifone || !others)
      throw new Error("Vui lòng nhập đủ 4 trường thông tin");
    if (!role.includes("root")) throw new Error("User is not access");
    await CompanyModel.findByIdAndUpdate(id, { sipPrice, rule, color });
    res.status(200).json({ success: true, message: "Update Successful" });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Update companies failed: ${error.message}`,
    });
  }
};

const createAccessibility = async (req, res) => {
  const { role, id } = req.decode;
  try {
    // if (role !== "root") throw new Error("User is not access");
    const { name } = req.body;
    if (!name) throw new Error("Vui lòng tên hành động");
    const findAccess = await AccessibilityModel.findOne({ name });
    if (findAccess) throw new Error("Thông tin đã tồn tại");
    const user = UserModel.findById(id);
    const accessibility = await AccessibilityModel.create({
      name,
      company: user.company,
    });
    res.status(200).json({
      success: true,
      message: "Accessibility created",
      data: accessibility,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Create Accessibility failed: ${error.message}`,
    });
  }
};

const getAccessibility = async (req, res) => {
  const { role, id } = req.decode;
  try {
    // if (role !== "root" && role !== "admin")
    //   throw new Error("User is not access");
    let filter = {};
    const user = await UserModel.findById(id);
    if (role === "admin") filter = { _id: user.role };
    const data = await AccessibilityModel.find();
    res
      .status(200)
      .json({ success: true, message: "Get accessibility successful", data });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Get companies failed ${error.message}`,
    });
  }
};

const createRole = async (req, res) => {
  const { role } = req.decode;
  try {
    // if (role !== "root") throw new Error("User is not access");
    const { name, permission, company, isDefault } = req.body;
    if (!name) throw new Error("Vui lòng tên vai trò");
    const findAccess = await AccessibilityModel.findOne({ name });
    if (findAccess) throw new Error("Thông tin đã tồn tại");
    const accessibility = await RoleModel.create({
      name,
      permission,
      company,
      isDefault,
    });
    res
      .status(200)
      .json({ success: true, message: "Role created", data: accessibility });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Create role failed: ${error.message}`,
    });
  }
};

const getRoles = async (req, res) => {
  const { role, _id } = req.decode;
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    let filter = {};
    const user = await UserModel.findById(_id);
    if (!role.includes("root")) filter = { company: user.company };
    const data = await RoleModel.find(filter);
    // console.log('data: ', data)
    res
      .status(200)
      .json({ success: true, message: "Get roles successful", data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Get roles failed ${error.message}`,
    });
  }
};

const createNewSIP = async (req, res) => {
  const { role } = req.decode;
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    const { extension, password, pbx } = req.body;
    if (!extension) throw new Error("Chưa nhập tên Extension");
    const findSIP = await SipModel.findOne({ extension });
    console.log({ findSIP });
    if (findSIP) throw new Error("Thông tin đã tồn tại");
    const SIP = await SipModel.create({ extension, password, pbx });
    res
      .status(200)
      .json({ success: true, message: "Tạo mới thành công", data: SIP });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Create SIP failed: ${error.message}`,
    });
  }
};

const getSIPs = async (req, res) => {
  const { role, _id } = req.decode;
  try {
    const { filters, options } = getParams(req);
    let filter = {};
    const user = await UserModel.findById(_id);
    if (!role.includes("root")) filter = { company: user.company };
    const data = await SipModel.find(
      { $and: [filter, filters] },
      null,
      options
    ).populate("pbx");
    res
      .status(200)
      .json({ success: true, message: "Get list successful", data });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Get list failed ${error.message}`,
    });
  }
};
const updateSIP = async (req, res) => {
  const { role } = req.decode;
  try {
    const { _id, extension, password, pbx } = req.body;

    if (role !== "root" && role !== "admin")
      throw new Error("User is not access");
    await CompanyModel.findByIdAndUpdate(_id, { extension, password, pbx });
    res.status(200).json({ success: true, message: "Update Successful" });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Update companies failed: ${error.message}`,
    });
  }
};

const createNewPBX = async (req, res) => {
  const { role } = req.decode;
  console.log("role: ", role);
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    const {
      name,
      host,
      SipPort,
      WsPort,
      db,
      inbound,
      outbound,
      context,
      detail,
    } = req.body;
    if (!name) throw new Error("Chưa nhập tên tổng đài");
    const findSIP = await PbxModel.findOne({ name });
    console.log({ findSIP });
    if (findSIP) throw new Error("Thông tin đã tồn tại");
    const PBX = await PbxModel.create({
      name,
      host,
      SipPort,
      WsPort,
      db,
      inbound,
      outbound,
      context,
      detail,
    });
    res
      .status(200)
      .json({ success: true, message: "Tạo mới thành công", data: PBX });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Create SIP failed: ${error.message}`,
    });
  }
};

const getPBXs = async (req, res) => {
  const { role, _id } = req.decode;
  try {
    let filter = {};
    const user = await UserModel.findById(_id);
    if (!role.includes("root")) filter = { company: user.company };
    const data = await PbxModel.find(filter);
    res
      .status(200)
      .json({ success: true, message: "Get list successful", data });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Get list failed ${error.message}`,
    });
  }
};
const createNewTelcoPrefix = async (req, res) => {
  const { role } = req.decode;
  console.log("role: ", role);
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    const { viettel, vinaphone, mobifone, others } = req.body;
    if (!viettel || !vinaphone || !mobifone || !others)
      throw new Error("Vui lòng nhập đủ thông tin");
    const PBX = await TelcoModel.create({
      viettel,
      vinaphone,
      mobifone,
      others,
    });
    res
      .status(200)
      .json({ success: true, message: "Tạo mới thành công", data: PBX });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Create TelcoPrefix failed: ${error.message}`,
    });
  }
};

const updateTelcoPrefix = async (req, res) => {
  const { role } = req.decode;
  console.log("role: ", role);
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    const { _id, viettel, vinaphone, mobifone, others } = req.body;
    if (!viettel || !vinaphone || !mobifone || !others)
      throw new Error("Vui lòng nhập đủ thông tin");
    const PBX = await TelcoModel.findByIdAndUpdate(_id, {
      viettel,
      vinaphone,
      mobifone,
      others,
    });
    res
      .status(200)
      .json({ success: true, message: "Tạo mới thành công", data: PBX });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Create TelcoPrefix failed: ${error.message}`,
    });
  }
};

const getTelcoPrefix = async (req, res) => {
  const { role, id } = req.decode;
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    let filter = {};
    const data = await PbxModel.find(filter);
    res
      .status(200)
      .json({ success: true, message: "Get list successful", data });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Get list failed ${error.message}`,
    });
  }
};

const createNewBillInfo = async (req, res) => {
  const { role } = req.decode;
  console.log("role: ", role);
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    const { name, type, price, company, user } = req.body;
    console.log("body: ", req.body);
    if (!name) throw new Error("Vui lòng nhập tên hoặc mô tả");

    const PBX = await BillModel.create({
      name,
      type,
      price,
      company,
      user,
    });
    res
      .status(200)
      .json({ success: true, message: "Tạo mới thành công", data: PBX });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Tạo thất bại: ${error.message}`,
    });
  }
};

const getBillInfo = async (req, res) => {
  const { role, _id } = req.decode;
  const { filters, options } = getParams(req);
  try {
    const user = await UserModel.findById(_id);
    const filter = {};
    if (!role.includes("root")) filter.company = user?.company;
    if (res.query.company) filter.company = res.query.company;

    let deposit = await BillModel.find(
      { $and: [filter, filters, { type: "deposit" }] },
      null,
      options
    )
      .populate("company")
      .populate("user");
    const create = await BillModel.find(
      {
        $and: [
          filter,
          filters,
          {
            type: {
              $in: [
                "createViettel",
                "createVinaphone",
                "createMobifone",
                "createOthers",
              ],
            },
          },
        ],
      },
      null,
      options
    )
      .populate("company")
      .populate("user");
    const sub = await BillModel.find(
      {
        $and: [
          filter,
          filters,
          {
            type: {
              $in: ["subViettel", "subVinaphone", "subMobifone", "subOthers"],
            },
          },
        ],
      },
      null,
      options
    )
      .populate("company")
      .populate("user");
    const price = await BillModel.find(
      {
        $and: [
          filter,
          filters,
          {
            type: {
              $in: [
                "priceViettel",
                "priceVinaphone",
                "priceMobifone",
                "priceOthers",
              ],
            },
          },
        ],
      },
      null,
      options
    )
      .populate("company")
      .populate("user");

    const analysBillCDRByCompany = await CDRModel.aggregate([
      {
        $match: {
          $and: [{ disposition: "ANSWERED" }, filter, filters], // Lọc các tài liệu có 'disposition' bằng 'ANSWERED'
        },
      },
      {
        $group: {
          _id: "$company", // Nhóm theo trường 'company'
          totalBill: {
            $sum: {
              $toDouble: "$bill", // Chuyển đổi giá trị của 'bill' sang kiểu số và tính tổng
            },
          },
        },
      },
      {
        $group: {
          _id: null, // Không nhóm theo trường nào cả
          total: {
            $sum: "$totalBill", // Tính tổng của các tổng 'bill' theo nhóm 'telco'
          },
          companies: {
            $push: {
              _id: "$_id",
              totalBill: "$totalBill",
            },
          },
        },
      },
    ]);
    console.log("analysBillCDRByCompany: ", analysBillCDRByCompany);
    const analysBillByType = await BillModel.aggregate([
      {
        $match: {
          $and: [
            {
              type: {
                $nin: [
                  "deposit",
                  "priceViettel",
                  "priceVinaphone",
                  "priceMobifone",
                  "priceOthers",
                ],
              },
            },
            filter,
            filters,
          ], // Lọc các tài liệu có 'disposition' bằng 'ANSWERED'
        },
      },
      {
        $group: {
          _id: "$type", // Nhóm theo trường 'company'
          bill: {
            $sum: {
              $toDouble: "$price",
            },
          },
        },
      },
      {
        $group: {
          _id: null, // Không nhóm theo trường nào cả
          totalBill: {
            $sum: "$bill", // Tính tổng của các tổng 'bill' theo nhóm 'telco'
          },
          types: {
            $push: {
              type: "$_id",
              bill: "$bill",
            },
          },
        },
      },
    ]);
    let newDeposit = [];
    for (const item of analysBillCDRByCompany[0].companies) {
      let totalBill = 0;
      let totalDeposit = 0;
      create.map((el) => {
        if (el.company._id.toString() == item._id.toString())
          totalBill += el.price;
      });
      sub.map((el) => {
        if (el.company._id.toString() == item._id.toString())
          totalBill += el.price;
      });
      // console.log('totalBill: ', totalBill)
      deposit.map((el) => {
        if (el.company._id.toString() == item._id.toString())
          totalDeposit += el.price;
      });

      const findDeposit = deposit.find(
        (el) => el.company._id.toString() == item._id.toString()
      );
      if (findDeposit) {
        Object.assign(findDeposit, {
          totalBill:
            item.totalBill + totalBill - (totalDeposit - findDeposit.price) < 0
              ? 0
              : item.totalBill + totalBill - (totalDeposit - findDeposit.price),
          surplus: totalDeposit - (item.totalBill + totalBill),
        });
        newDeposit.push(findDeposit);
        await BillModel.findByIdAndUpdate(
          findDeposit._id,
          {
            $set: {
              totalBill: findDeposit.totalBill,
              surplus: findDeposit.surplus,
            },
          },
          { runValidators: false }
        );
      }

      // console.log('item._id: ', item._id)
      // console.log('comany._id: ', deposit[0].company._id)
      // console.log('findDeposit: ', findDeposit)
    }
    deposit = await BillModel.find(
      { $and: [filter, filters, { type: "deposit" }] },
      null,
      options
    )
      .populate("company")
      .populate("user");

    // console.log('analys: ', analys)
    // console.log('deposit: ', deposit)
    // console.log('newDeposit: ', newDeposit)
    res
      .status(200)
      .json({
        success: true,
        message: "Get list successful",
        data: {
          deposit,
          create,
          sub,
          price,
          analysBillByType,
          analysBillCDRByCompany,
        },
      });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Get list failed ${error.message}`,
    });
  }
};

const exportUser = async (req, res) => {
  try {
    const rolePermit = req.decode.role;
    const id = req.decode.id;
    const { filters, options } = getParams(req);
    let filterPlus = {};
    // const { role } = req.query
    if (rolePermit === "sales") throw new Error("User not permission");
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
    const users = await UserModel.find(filterPlus, null, options)
      .populate("teamleadTag", ["name"])
      .populate("supervisorTag", ["name"])
      .populate("ASMTag", ["name"])
      .populate("headTag", ["name"])
      .populate("company", ["name"]);

    let dataExport = [];

    users &&
      users.map((item) => {
        const data = item;
        const latestData = {
          id: data.id,
          createDate: moment.formatTime(data.createdAt),
          upDate: moment.formatTime(data.updatedAt),
          recentRequest: moment.formatTime(data.request.startTime),
          userName: data.userName,
          name: data.name,
          identification: data.identification,
          phone: data.phone,
          role: data.role,
          status: data.status,
          salesTag: data.salesTag?.name,
          teamleadTag: data.teamleadTag?.name,
          supervisorTag: data.supervisorTag?.name,
          ASMTag: data.ASMTag?.name,
          headTag: data.headTag?.name,
        };
        dataExport.push(latestData);
        // console.log({data, latestData})
      });

    // res
    //   .status(200)
    //   .json({ success: true, message: "get list successful", dataExport });

    const pathFile = await exportExcel(dataExport);
    res.status(200).download(pathFile);
  } catch (error) {
    console.log({ error });
    res.status(400).json({ success: false, message: error.message });
  }
};

const uploadLogo = async (req, res) => {
  try {
    const { role } = req.decode;
    if (role !== "root") throw new Error("Not permission");
    const { id } = req.body;
    const filePath = req.file.path;
    await CompanyModel.findByIdAndUpdate(id, {
      image: filePath,
    });
    res.status(200).json({ success: true, message: "upload image successful" });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const impersonate = async (req, res) => {
  try {
    const { role } = req.decode;
    const { idTarget } = req.body;
    if (role !== "root") throw new Error("Not permission");
    const user = await UserModel.findById(idTarget);
    if (user.role === "root") throw new Error("Not permission");
    const tokens = generateToken(user);
    res
      .status(200)
      .json({ success: true, message: "impersonate successful", data: tokens });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({
      success: false,
      message: `impersonate failed - ${error.message}`,
    });
  }
};

const updateAllUsers = async (req, res) => {
  try {
    const role = req.decode.role;
    const action = req.body.action;
    if (role === "root" && action === "all") {
      // const users = await UserModel.find({request: { $exists: false }}).lean().exec();
      const users = await UserModel.find().lean().exec();
      // const total = users.length;
      const total = users.length;
      console.log({ users });
      users.map(async (user) => {
        if (user.role === "teamlead") {
          await UserModel.findByIdAndUpdate(user._id, {
            teamleadTag: user._id,
          }).exec();
        }
        if (user.role === "supervisor") {
          await UserModel.findByIdAndUpdate(user._id, {
            supervisorTag: user._id,
          }).exec();
        }
        if (user.role === "ASM") {
          await UserModel.findByIdAndUpdate(user._id, {
            ASMTag: user._id,
          }).exec();
        }
        if (user.role === "head") {
          await UserModel.findByIdAndUpdate(user._id, {
            headTag: user._id,
          }).exec();
        }
        if (user.role === "ADP") {
          await UserModel.findByIdAndUpdate(user._id, {
            ADPTag: user._id,
          }).exec();
        }
      });
      res.json({
        success: true,
        message: "all users is updated",
        data: { total },
      });
    } else {
      throw new Error("update failed");
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export default {
  createUser,
  getUser,
  getListUsers,
  createCompany,
  getCompanies,
  updateCompanies,
  updateUser,
  deleteUser,
  exportUser,
  changePassword,
  resetPassword,
  uploadLogo,
  impersonate,
  createAccessibility,
  getAccessibility,
  createRole,
  getRoles,
  createNewSIP,
  getSIPs,
  updateSIP,
  createNewPBX,
  getPBXs,
  createNewTelcoPrefix,
  getTelcoPrefix,
  updateTelcoPrefix,
  createNewBillInfo,
  getBillInfo,
  updateAllUsers,
};
