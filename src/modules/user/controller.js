import {
  UserModel,
  CompanyModel,
} from "../../controllers/mongodb/index.js";
// import { CompanyModel } from "../../controllers/mongodb/models/Company.js";
import { getParams } from "../../util/getParams/index.js";
import argon2 from "argon2";
import auth from  "../../util/authentication/auth.js"
import { exportExcel } from "../../util/excel/excel.js";
import moment from "../../util/monent/moment.js";

const { generateToken } = auth
const createUser = async (req, res) => {
  let {
    userName,
    password,
    name,
    phone,
    company,
    hometown,
    adminTag,
    ADPTag,
    headTag,
    ASMTag,
    supervisorTag,
    teamleadTag,
    identification,
    role,
    type,
    title,
    sipUser,
    sipPassword,
    sipServer,
  } = req.body;
  //simple validation
  console.log(req.body);
  if (!userName || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Missing userName or Password" });
  }
  try {
    const user = await UserModel.findOne({ userName });
    if (user) {
      throw new Error("User already exists");
    }
    const roleList = ["sales", "teamlead", "supervisor", "ASM", "head", "ADP"];
    const level = await roleList.indexOf(role);
    let i = level + 1;
    // console.log({ level });

    do {
      if (i === 2 && teamleadTag) {
        const findUser = await UserModel.findById(teamleadTag);
        supervisorTag = findUser.supervisorTag;
      }
      if (i === 3 && supervisorTag) {
        const findUser = await UserModel.findById(supervisorTag);
        ASMTag = findUser.ASMTag;
      }
      if (i === 4 && ASMTag) {
        const findUser = await UserModel.findById(ASMTag);
        headTag = findUser.headTag;
      }
      if (i === 5 && headTag) {
        const findUser = await UserModel.findById(headTag);
        ADPTag = findUser.ADPTag;
      }
      i += 1;
      // console.log("loop i: ", i);
    } while (i <= 5);

    //All good
    const hashedPassword = await argon2.hash(password);

    // console.log({hashedPassword})
    const findCompany = await CompanyModel.findById(company);
    const code = `${findCompany.name.slice(0, 2)}${findCompany.countCode}`;
    const newUser = (
      await UserModel.create({
        userName,
        password: hashedPassword,
        name,
        phone,
        company,
        code,
        hometown,
        adminTag,
        ADPTag,
        headTag,
        ASMTag,
        supervisorTag,
        teamleadTag,
        identification,
        role,
        type,
        title,
        sipAccount: {
          extension: sipUser,
          password: sipPassword,
          server: sipServer,
        },
      })
    ).toObject({ versionKey: false });
    let roleTag = ''
    if(role==='teamlead') {
      roleTag = 'teamleadTag'
    } else if (role === 'supervisor') {
      roleTag = 'supervisorTag'
    } else if (role === 'ASM') {
      roleTag = 'ASMTag'
    } else if (role === 'head') {
      roleTag = 'headTag'
    } else if (role === 'ADP') {
      roleTag = 'ADPTag'
    }
    const findID = await UserModel.findOne({userName})
    if(findID) await UserModel.findOneAndUpdate({userName}, {[roleTag]:findID._id})
    await CompanyModel.findByIdAndUpdate(company, {
      countCode: findCompany.countCode + 1,
    });
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
      res
        .status(200)
        .json({ success: true, message: "New password is changed" });
    
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getListUsers = async (req, res) => {
  try {
    const rolePermit = req.decode.role;
    const id = req.decode.id;
    const user = await UserModel.findById(id)
    const { filters, options } = getParams(req);
    let filterPlus = {};
    // const { role } = req.query
    if (rolePermit === "sales") throw new Error("User not permission");
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
    const users = await UserModel.find(filterPlus, null, options)
      .populate("teamleadTag", ["name"])
      .populate("supervisorTag", ["name"])
      .populate("ASMTag", ["name"])
      .populate("headTag", ["name"])
      .populate("company");
    const total = await UserModel.countDocuments(filterPlus);
    const count = users.length;
    res.status(200).json({
      success: true,
      message: "Get list is successful",
      data: { role: rolePermit, total, count, users },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const getUser = async (req, res) => {
  try {
    let user = {};
    if (req.query.id) {
      const id = req.query.id;
      user = await UserModel.findById(id)
        .populate("company")
        .populate("headTag", ["name"])
        .populate("ASMTag", ["name"])
        .populate("supervisorTag", ["name"])
        .populate("teamleadTag", ["name"]);
    } else {
      const { id } = req.decode;
      user = await UserModel.findById(id)
        .populate("company")
        .populate("headTag", ["name"])
        .populate("ASMTag", ["name"])
        .populate("supervisorTag", ["name"])
        .populate("teamleadTag", ["name"]);
    }
    res
      .status(200)
      .json({ success: true, message: "Get user is successful", data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const updateUser = async (req, res) => {
  try {
    // let user = {}
    const rolePermit = req.decode.role
    if(rolePermit !== 'root' && rolePermit !== 'admin') throw new Error('Not permission')
    const data = req.body;
    // console.log({ data });
    let {
      _id,
      title,
      name,
      code,
      codeSHB,
      codeMAFC,
      role,
      type,
      status,
      sipAccount,
      permission,
      headTag,
      ASMTag,
      supervisorTag,
      teamleadTag,
    } = data;
    codeSHB = codeSHB ? codeSHB.trim() : "";
    codeMAFC = codeMAFC ? codeMAFC.trim() : "";
    const findUser = await UserModel.findById(_id);
    if (findUser.role === "root") throw new Error("Can not change user root");
    // console.log(findUser);
    const allUsers = await UserModel.find().lean().exec();
    let checkCodeSHB = 0;
    codeSHB &&
      allUsers.map((item) => {
        if (JSON.stringify(item._id) !== JSON.stringify(_id) && item.codeSHB === codeSHB) {
          checkCodeSHB += 1;
        }
      });
    // console.log({ checkCodeSHB });
    if (checkCodeSHB > 0) throw new Error("Code SHB exists");
    let checkCodeMAFC = 0;
    codeMAFC &&
      allUsers.map((item) => {
        if (JSON.stringify(item._id) !== JSON.stringify(_id) && item.codeMAFC === codeMAFC) {
          checkCodeMAFC += 1;
        }
      });
    if (checkCodeMAFC > 0) throw new Error("Code MAFC exists");
    if (status === "Locked") {
      await UserModel.findByIdAndUpdate(_id, { status, refreshToken: null });
    } else {
      await UserModel.findByIdAndUpdate(_id, {
        title,
        name,
        code,
        codeSHB,
        codeMAFC,
        role,
        type,
        status,
        sipAccount,
        permission,
        headTag,
        ASMTag,
        supervisorTag,
        teamleadTag,
      });
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
    if (role !== "root") throw new Error("User is not access");
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
    if (role !== "root" && role !== "admin")
      throw new Error("User is not access");
    let filter = {};
    const user = await UserModel.findById(id);
    if (role === "admin") filter = { _id: user.company };
    const data = await CompanyModel.find(filter);
    res.status(200).json({ success: true, message: "Company created", data });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Get companies failed ${error.message}`,
    });
  }
};
const updateCompanies = async (req, res) => {
  const { role } = req.decode;
  try {
    const { id, unitPrice, rule, color } = req.body;
    console.log("req.body: ", req.body);
    const { viettel, vinaphone, mobifone, vietnammobile } = unitPrice;
    if (!viettel || !vinaphone || !mobifone || !vietnammobile)
      throw new Error("Vui lòng nhập đủ 4 trường thông tin");
    if (role !== "root" && role !== "admin")
      throw new Error("User is not access");
    await CompanyModel.findByIdAndUpdate(id, { unitPrice, rule, color });
    res.status(200).json({ success: true, message: "Update Successful" });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Update companies failed: ${error.message}`,
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
    console.log({error})
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
    const {idTarget} = req.body
    if (role !== "root") throw new Error("Not permission");
    const user = await UserModel.findById(idTarget)
    if (user.role === 'root') throw new Error('Not permission')
    const tokens = generateToken(user)
    res.status(200).json({ success: true, message: "impersonate successful", data: tokens });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: `impersonate failed - ${error.message}` });
  }
};

const updateAllUsers = async (req, res) => {
  try {
    const role = req.decode.role;
    const action = req.body.action;
    if (role === "root" && action === "all") {
      // const users = await UserModel.find({request: { $exists: false }}).lean().exec();
      const users = await UserModel.find()
        .lean()
        .exec();
      // const total = users.length;
      const total = users.length;
      console.log({ users });
      users.map(async (user) => {
        if (user.role === 'teamlead') {
          await UserModel.findByIdAndUpdate(user._id, {
            teamleadTag: user._id,
          }).exec();
        }
        if (user.role === 'supervisor') {
          await UserModel.findByIdAndUpdate(user._id, {
            supervisorTag: user._id,
          }).exec();
        }
        if (user.role === 'ASM') {
          await UserModel.findByIdAndUpdate(user._id, {
            ASMTag: user._id,
          }).exec();
        }
        if (user.role === 'head') {
          await UserModel.findByIdAndUpdate(user._id, {
            headTag: user._id,
          }).exec();
        }
        if (user.role === 'ADP') {
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
  updateAllUsers,
};
