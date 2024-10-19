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
import elastic, {
  createDocument,
  updateDocument,
} from "../../controllers/elasticsearch/index.js";
import pkg from "lodash";

const { get } = pkg;

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
    const rolePermit = req.decode?.role;
    if (!rolePermit.includes("root")) throw new Error("User is not access");
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
    const dataUpdate = UserModel.findOne(newUser.username)
      .populate("company")
      .populate("usersTag")
      .populate("role")
      .populate("sipAccount")
      .lean()
      .exec();
    const { _id, ...rest } = dataUpdate;
    await createDocument("finstar", "users", _id, rest);
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
    const id = req.decode._id;
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
    const rolePermit = req.decode?.role;
    const username = req.body.username;
    if (!rolePermit.includes("root") && !rolePermit.includes("admin"))
      throw new Error("User is not access");
    // const role = req.decode.role;
    console.log("body: ", req.body);

    const newPassword = "12345678";
    const user = await UserModel.findOne({ username });
    if (!user) {
      throw new Error("user not found");
    }
    const hashedPassword = await argon2.hash(newPassword);
    await UserModel.findOneAndUpdate(
      { username },
      { password: hashedPassword }
    );
    res.status(200).json({
      success: true,
      message: "Reset successful - New password is 12345678",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getListUsers = async (req, res) => {
  try {
    const { role, _id } = req.decode;
    let filter = {};
    let {
      status,
      company,
      role: roleFilter,
      keyword,
      limit,
      page,
      sort,
    } = req.query;
    const user = await UserModel.findById(_id);
    console.log("user: ", user);
    if (!role.includes("root")) {
      company = user?.company;
      filter = { company: user.company };
    }
    const searchUser = async (keyword) => {
      const body = {
        query: {
          bool: {
            must: [],
          },
        },
      };
      if (keyword) {
        const searchQuery = {
          bool: {
            should: [
              {
                match: {
                  firstname: {
                    query: keyword,
                    analyzer: "my_analyzer",
                  },
                },
              },
              {
                match: {
                  firstname: {
                    query: keyword,
                    // analyzer: "my_analyzer_2",
                  },
                },
              },
              {
                match: {
                  lastname: {
                    query: keyword,
                    // analyzer: "my_analyzer_2",
                  },
                },
              },
              {
                match: {
                  username: {
                    query: keyword,
                    // analyzer: "my_analyzer_2",
                  },
                },
              },
              {
                match: {
                  "sipAccount.extension": {
                    query: keyword,
                    // analyzer: "my_analyzer_2",
                  },
                },
              },
              {
                match: {
                  "company.name": {
                    query: keyword,
                    // analyzer: "my_analyzer_2",
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        };
        body.query.bool.must.push(searchQuery);
      } else {
        const searchQuery = {
          bool: {
            should: [{ match_all: {} }],
          },
        };
        body.query.bool.must.push(searchQuery);
      }
      if (status) body.query.bool.must.push({ term: { status } });
      if (company)
        body.query.bool.must.push({ term: { "company._id": company } });
      if (limit) body.size = limit;
      if (page) body.from = (page - 1) * (limit || 10);
      if (!sort) body.sort = [{ createdAt: "asc" }];
      const result = await elastic.search({
        index: "finstar",
        body,
      });
      console.log("result: ", JSON.stringify(body));
      return result;
    };

    const result = await searchUser(keyword);
    const users = get(result, "body.hits.hits", []).map((item) => {
      // eslint-disable-next-line no-unused-vars
      const { refreshToken, password, request, ...rest } = item._source;
      return { ...rest, _id: item._id };
    });
    const count = users.length;
    const total = get(result, "body.hits.total.value", []);
    return res.status(200).json({
      success: true,
      message: "Get list is successful",
      data: { total, count, users },
    });

    // const user = await UserModel.findById(_id);
    // console.log("user: ", user);
    // if (!role.includes("root")) filter = { company: user.company };
    // if (!role.includes("root") && !role.includes("admin"))
    //   filter = { ...filter, usersTag: _id };
    // const { filters, options } = getParams(req);
    // let filterPlus = {};
    // const users = await UserModel.find(
    //   { $and: [filters, filter] },
    //   null,
    //   options
    // )
    //   .populate("company")
    //   .populate("usersTag")
    //   .populate("role")
    //   .populate("sipAccount")
    //   .lean()
    //   .exec();

    // /** Insert users to elasticsearch */
    // // users.map(async (obj) => {
    // //   const { _id, ...rest } = obj;
    // //   await createDocument("finstar", "users", _id, rest);
    // // });
    // const total = await UserModel.countDocuments(filterPlus);
    // const count = users.length;
    // res.status(200).json({
    //   success: true,
    //   message: "Get list is successful",
    //   data: { total, count, users },
    // });
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
    const rolePermit = req.decode?.role;
    if (!rolePermit.includes("root") && !rolePermit.includes("admin"))
      throw new Error("User is not access");
    const data = req.body;
    console.log('param: ', data);
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
    const findUser = await UserModel.findOne({ username }).populate("role");
    if (findUser?.role.find((role) => role.name === "root"))
      throw new Error("Can not change user root");
    const updateUserTags = async (userId, newTags) => {
      await UserModel.findByIdAndUpdate(userId, { usersTag: newTags });
      const user = await UserModel.findById(userId).populate("usersTag");
      // console.log("user1: ", user);

      // Hàm đệ quy để lấy tất cả usersTag của user
      const getAllTags = async (user) => {
        const tags = new Set(user.usersTag.map((tag) => tag._id.toString()));
        // console.log("tags: ", tags);

        for (const tag of user.usersTag) {
          const nestedUser = await UserModel.findById(tag).populate("usersTag");
          const nestedTags = await getAllTags(nestedUser);
          nestedTags.forEach(tags.add, tags);
          // console.log({ nestedTags, nestedUser });
        }

        return tags;
      };

      const allTags = await getAllTags(user);
      newTags.forEach(allTags.add, allTags);

      const news = Array.from(allTags);
      // console.log("user2: ", user);
      // console.log("new: ", news);
      await UserModel.findByIdAndUpdate(user._id, { usersTag: news });
      // await user.save();
    };

    if (!sipAccount) {
      const update = await SipModel.findByIdAndUpdate(findUser?.sipAccount, {
        user: null,
        usersTag: null,
        company: null,
      }, {new: true}).lean().exec();
      const dataElasticUpdate = {extension: update}
      const id = findUser._id;
      console.log('id: ', id);
      await updateDocument("finstar", findUser._id, dataElasticUpdate);
    }
    if (sipAccount) {
      const update = await SipModel.findByIdAndUpdate(sipAccount, {
        user: findUser._id,
        usersTag: usersTag || findUser.usersTag,
        company: company || findUser.company,
      },{new: true}).lean().exec();
      console.log('update SIP account: ', update);
      const dataElasticUpdate = {sipAccount: update}
      const id = findUser._id;
      console.log('id: ', id);
      await updateDocument("finstar", id, dataElasticUpdate);
    }
    if (status === "Locked") {
      const update = await UserModel.findOneAndUpdate(
        { username },
        { status, refreshToken: null },
        { new: true }
      ).lean().exec();
      console.log('update status: ', update);
      const { _id, ...rest } = update;
      await updateDocument("finstar", _id, {status});
    } else if (findUser && usersTag.length) {
      updateUserTags(findUser._id, usersTag);
      const update = await UserModel.findOneAndUpdate(
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
        },
        { new: true }
      ).populate("usersTag").populate("role").populate("sipAccount").populate("company").lean().exec();
      const { _id, ...rest } = update;
      console.log('update status: ', update);
      await updateDocument("finstar", _id, rest);
    } else {
      const update = await UserModel.findOneAndUpdate(
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
          usersTag: [],
        },
        { new: true }
      ).populate("usersTag").populate("role").populate("sipAccount").populate("company").lean().exec();
      console.log('update status: ', update);
      const { _id, ...rest } = update;
      await updateDocument("finstar", _id, rest);
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
  const { role, _id } = req.decode;
  try {
    // if (role !== "root" && role !== "admin")
    //   throw new Error("User is not access");
    let filter = {};
    const user = await UserModel.findById(_id);
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
  const { _id, role } = req.decode;
  try {
    if (!role.includes("root") && !role.includes("admin"))
      throw new Error("User is not access");
    const { name, descsiption } = req.body;
    if (!name) throw new Error("Vui lòng tên hành động");
    const findAccess = await AccessibilityModel.findOne({ name });
    if (findAccess) throw new Error("Thông tin đã tồn tại");
    const user = UserModel.findById(_id);
    const accessibility = await AccessibilityModel.create({
      name,
      descsiption,
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
  const { role, _id } = req.decode;
  try {
    // if (role !== "root" && role !== "admin")
    //   throw new Error("User is not access");
    let filter = {};
    const user = await UserModel.findById(_id);
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
  const { filters } = getParams(req);
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    let filter = {};
    const user = await UserModel.findById(_id);
    if (!role.includes("root")) filter = { company: user.company };
    const data = await RoleModel.find({ $and: [filter, filters] }).populate(
      "permission"
    );
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
    const { _id, extension, password } = req.body;

    if (!role.includes("root")) throw new Error("User is not access");
    await CompanyModel.findByIdAndUpdate(_id, { extension, password });
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
  const { role } = req.decode;
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
  // console.log("role: ", role);
  try {
    if (!role.includes("root")) throw new Error("User is not access");
    const { name, type, price, price2, price3, company, user } = req.body;
    console.log("body: ", req.body);
    if (!name) throw new Error("Vui lòng nhập tên hoặc mô tả");

    const PBX = await BillModel.create({
      name,
      type,
      price,
      price2,
      price3,
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
    const startMonth = (date) => {
      const day = new Date(date);
      const startMonth = new Date(
        day.getFullYear(),
        day.getMonth(),
        1,
        0,
        0,
        0,
        0
      );
      return startMonth;
    };

    const user = await UserModel.findById(_id);
    const filter = {};
    const { company, gteDate } = req.query;
    console.log("role: ", role);
    if (!role.includes("root")) console.log("is root******");
    if (!role.includes("root")) filter.company = user?.company;
    if (company) filter.company = company;
    console.log("filter: ", filter);
    console.log("filters: ", filters);

    let deposit = await BillModel.find(
      { $and: [filter, { type: "deposit" }] },
      null,
      options
    ).populate("company", ["name"]);
    // .populate("user",["username"]);
    let create = await BillModel.find(
      {
        $and: [
          filter,
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
      .populate("company", ["name"])
      .populate("user", ["username"]);
    let sub = await BillModel.find(
      {
        $and: [
          filter,
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
      .populate("company", ["name"])
      .populate("user", ["username"]);
    let price = await BillModel.find(
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
      .populate("company", ["name"])
      .populate("user", ["username"]);

    const analysBillCDRByCompany = await CDRModel.aggregate([
      {
        $match: {
          $and: [{ disposition: "ANSWERED" }, filters], // Lọc các tài liệu có 'disposition' bằng 'ANSWERED'
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
          totalBill2: {
            $sum: {
              $toDouble: "$bill2", // Chuyển đổi giá trị của 'bill' sang kiểu số và tính tổng
            },
          },
          totalBill3: {
            $sum: {
              $toDouble: "$bill3", // Chuyển đổi giá trị của 'bill' sang kiểu số và tính tổng
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
          total2: {
            $sum: "$totalBill2", // Tính tổng của các tổng 'bill' theo nhóm 'telco'
          },
          total3: {
            $sum: "$totalBill3", // Tính tổng của các tổng 'bill' theo nhóm 'telco'
          },
          companies: {
            $push: {
              _id: "$_id",
              totalBill: "$totalBill",
              totalBill2: "$totalBill2",
              totalBill3: "$totalBill3",
            },
          },
        },
      },
    ]);
    // console.log("analysBillCDRByCompany: ", analysBillCDRByCompany);
    if (gteDate) req.query.gteDate = startMonth(gteDate);
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
            // filters,
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
    // if (analysBillCDRByCompany.length)
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

      // gán prop trước khi update DB
      if (findDeposit) {
        Object.assign(findDeposit, {
          totalBill:
            item.totalBill + totalBill - (totalDeposit - findDeposit.price) < 0
              ? 0
              : item.totalBill + totalBill - (totalDeposit - findDeposit.price),
          totalBill2:
            item.totalBill2 + totalBill - (totalDeposit - findDeposit.price) < 0
              ? 0
              : item.totalBill2 +
                totalBill -
                (totalDeposit - findDeposit.price),
          totalBill3:
            item.totalBill3 + totalBill - (totalDeposit - findDeposit.price) < 0
              ? 0
              : item.totalBill3 +
                totalBill -
                (totalDeposit - findDeposit.price),
          surplus: totalDeposit - (item.totalBill + totalBill),
          surplus2: totalDeposit - (item.totalBill2 + totalBill),
          surplus3: totalDeposit - (item.totalBill3 + totalBill),
        });
        newDeposit.push(findDeposit);
        await BillModel.findByIdAndUpdate(
          findDeposit._id,
          {
            $set: {
              totalBill: findDeposit.totalBill,
              totalBill2: findDeposit.totalBill2,
              totalBill3: findDeposit.totalBill3,
              surplus: findDeposit.surplus,
              surplus2: findDeposit.surplus2,
              surplus3: findDeposit.surplus3,
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
      { $and: [filter, { type: "deposit" }] },
      null,
      options
    )
      .populate("company", ["name"])
      .populate("user", ["username"]);

    create = await BillModel.find(
      {
        $and: [
          filter,
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
      .populate("company", ["name"])
      .populate("user", ["username"]);
    sub = await BillModel.find(
      {
        $and: [
          filter,
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
      .populate("company", ["name"])
      .populate("user", ["username"]);
    price = await BillModel.find(
      {
        $and: [
          filter,
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
      .populate("company", ["name"])
      .populate("user", ["username"]);

    // console.log('analys: ', analys)
    // console.log('deposit: ', deposit)
    // console.log('newDeposit: ', newDeposit)
    res.status(200).json({
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
