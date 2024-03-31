
import {
  UserModel,
  AutoCallModel,
  CustomerModel,
} from "../../controllers/mongodb/index.js";
import { getParams } from "../../util/getParams/index.js";
import axios from "axios";
import { AMI_WORKER_PORT, AMI_WORKER_HOST } from "../../util/config/index.js";

const createCampaign = async (req, res) => {
  try {
    const { id } = req.decode;
    const user = await UserModel.findById(id);
    const data = req.body;
    let { name, type, timeout, timeInterval, concurrency, list } = data;
    console.log({ data });
    if (!timeout) timeout = 40;
    if (!timeInterval) timeInterval = 40;
    if (!concurrency) concurrency = 1;
    const campaign = await AutoCallModel.create({
      name,
      type,
      total: list.length,
      context: user.sipAccount.context,
      timeout,
      timeInterval,
      concurrency,
      user: id,
      companyTag: user.company,
    });
    list.map(async (item) => {
      await CustomerModel.findByIdAndUpdate(item, {
        autocallCampaign: campaign._id,
        autocallStatus: "Pending",
      });
    });
    console.log({ campaign });
    res.status(200).json({
      success: true,
      message: `Campaign ${name} created`,
      data: [],
    });
  } catch (error) {
    console.log({ error });
    res.status(400).json({
      success: false,
      message: `Failed initiate call - ${error.message}`,
    });
  }
};

const fetchCampaignList = async (req, res) => {
  try {
    const { filters, options } = getParams(req);
    const data = await AutoCallModel.find(filters, null, options);
    res
      .status(200)
      .json({ success: true, message: "get list successful", data });
  } catch (error) {
    console.log("ERROR", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const actionCampaign = async (req, res) => {
  try {
    const { role } = req.decode;
    const campaignID = req.body.id;
    // const user = await UserModel.findById(id)
    if (role !== "root" && role !== "admin") throw new Error("Not permission");
    // call worker 
    const requestConfig = {
      method: "post",
      url: `http://${AMI_WORKER_HOST}:${AMI_WORKER_PORT}/api/ami/worker/campaign/start`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.token}`,
      },
      data: { id: campaignID },
    };
    let success = false
    let dataError = {}
    await axios(requestConfig)
      .then((res) => {
        success = res.data.success
      })
      .catch((error) => {
        // console.log(error.response.data)
        dataError = error.response.data;
      });
      console.log({ dataError });
    if (Object.keys(dataError).length !== 0) throw new Error(dataError.message);
    if(success) {
      res.status(200).json({
        success: true,
        message: `Campaign is starting`,
        data: [],
      });
    } else throw new Error("Worker not response")
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed action campaign - ${error.message}`,
    });
  }
};

const stopCampaign = async (req, res) => {
  try {
    const { role } = req.decode;
    console.log(req.body)
    const campaignID = req.body.id;
    // const user = await UserModel.findById(id)
    if (role !== "root" && role !== "admin") throw new Error("Not permission");
    await AutoCallModel.findByIdAndUpdate(campaignID, {
      status: "Pending",
    });

    res.status(200).json({
      success: true,
      message: `Campaign is Stopped`,
      data: [],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed initiate call - ${error.message}`,
    });
  }
};
const removeCampaign = async (req, res) => {
  try {
    const { role } = req.decode;
    console.log(req.body)
    const campaignID = req.body.id;
    // const user = await UserModel.findById(id)
    if (role !== "root" && role !== "admin") throw new Error("Not permission");
    await AutoCallModel.findByIdAndDelete(campaignID);

    res.status(200).json({
      success: true,
      message: `Campaign is Removed`,
      data: [],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed initiate call - ${error.message}`,
    });
  }
};

export default {
  createCampaign,
  actionCampaign,
  fetchCampaignList,
  stopCampaign,
  removeCampaign,
};
