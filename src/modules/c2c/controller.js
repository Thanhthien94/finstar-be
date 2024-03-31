
import { ContextModel } from "../../controllers/mongodb/index.js";
// import sort from '../../util/sort/sort.js'
import axios from "axios";
import {
  C2C_WORKER_HOST,
  C2C_WORKER_PORT,
} from "../../util/config/index.js";

const getContextList = async (req, res) => {
  try {
    const { role } = req.decode;
    if (role !== "admin" && role !== "root") throw new Error("Unauthorized");
    const context = await ContextModel.find();
    res
      .status(200)
      .json({
        success: true,
        message: "Get list context successful",
        data: context,
      });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Can not get list context ${error.message}`,
    });
  }
};

const addContext = async (req, res) => {
  try {
    const { role } = req.decode;
    if (role !== "admin" && role !== "root") throw new Error("Unauthorized");
    const { name, server } = req.body;
    const context = await ContextModel.create({ name, server });
    res
      .status(200)
      .json({
        success: true,
        message: "Add context successful",
        data: context,
      });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Can not add new context ${error.message}`,
    });
  }
};

const createCallGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const context = await ContextModel.create({ name });
    res
      .status(200)
      .json({
        success: true,
        message: "Add context successful",
        data: context,
      });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Can not add new context ${error.message}`,
    });
  }
};

const updateContext = async (req, res) => {
  try {
    const { role } = req.decode;
    if (role !== "admin" && role !== "root") throw new Error("Unauthorized");
    const context = await ContextModel.findByIdAndUpdate();
    res
      .status(200)
      .json({
        success: true,
        message: "Add context successful",
        data: context,
      });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Can not create context",
    });
  }
};

const c2c = async (req, res) => {
  try {
    const number = req.body.number;
    const requestConfig = {
      method: "post",
      url: `http://${C2C_WORKER_HOST}:${C2C_WORKER_PORT}/api/ami/call/worker`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: {number},
    };
    let success = false;
    let dataError = {};
    await axios(requestConfig)
      .then((res) => {
        success = res.data.success
        // console.log('res: ', res)
        
      })
      .catch((error) => {
        // console.log({error})
        dataError = error.response.data;
      });
    console.log({ dataError });
    if (Object.keys(dataError).length !== 0) throw new Error(dataError.message);
    if(success) {
        res
          .status(200)
          .json({
            success: true,
            message: `Call initiated successful to ${number}`,
          });
    }
  } catch (error) {
    console.log(`call initial false ${error}`);
    res.status(400).json({
      success: false,
      message: `Failed initiate call 2 - ${error.message}`,
    });
  }
};

export default {
  c2c,
  addContext,
  getContextList,
  updateContext,
  createCallGroup,
};
