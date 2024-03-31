import express from 'express'
import auth from "../../util/authentication/auth.js";
// import call from "../../controllers/ami/index.js"
import { UserModel } from "../../controllers/mongodb/index.js";
import ami from "../../controllers/ami/ami.js";

// const {ami} = call
const Route = express.Router()
const {verifyToken} = auth

const c2c = async (req, res) => {
    try {
        const { id } = req.decode;
        const user = await UserModel.findById(id);
        // console.log({ user })
        const { extension, context, server, callType } = user.sipAccount;
        const { number } = req.body;
        console.log({number})
        console.log({ extension, context, server, callType })
        // console.log({ context })
        // if (callType === 'single') {
        //     const setContext = context;
        //     console.log({ setContext })
        //     await ami.action({
        //         action: 'originate',
        //         channel: `PJSIP/${extension}`,
        //         context: setContext,
        //         priority: 1,
        //         exten: number,
        //         async: 'true',
        //         callerid: extension,
        //     }, (error, event) => {
        //         if (error) {
        //             console.log(error);
        //             res
        //                 .status(400)
        //                 .json({
        //                     success: false,
        //                     message: `Worker Failed initiate call - ${error.message}`,
        //                 })
        //         } else {
        //             console.log(event)
        //             res
        //                 .status(200)
        //                 .json({ success: true, message: `Call initiated successful to ${number}`, data: event });
        //         }
        //     })
        // }
        if(!context) {
            await ami.clickToCall(extension, number)
        } else {
            await ami.clickToCall2(extension, number, context)
        }
        res
            .status(200)
            .json({ success: true, message: `Call initiated successful to ${number}` });
    } catch (error) {
        console.log(`call initial false ${error}`)
        res
            .status(400)
            .json({
                success: false,
                message: `Failed initiate call - ${error.message}`,
            })

    }
}

const disableTrunk = async (req, res) => {
  try {
    const trunkId = req.body.trunkId;
    console.log({ trunkId });
    await ami.action(
      {
        action: "command",
        command: `fwconsole trunks`,
      },
      (error, event) => {
        if (error) {
          console.log(error);
          res.status(400).json({
            success: false,
            message: `Failed disable - ${error.message}`,
          });
        } else {
          console.log(event);
          res
            .status(200)
            .json({ success: true, message: `Trunk ${trunkId} was disabled` });
        }
      }
    );
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to disable trunk - ${error.message}`,
    });
  }
};

Route.post('/call/worker', verifyToken, c2c)

export default Route
