import express from "express";
import worker from "./worker.js";
import auth from "../../util/authentication/auth.js";

const { verifyToken } = auth;
const Route = express.Router()
Route.post('/cdr/downloadCDR', verifyToken, worker.fetchCDRToDownload)
Route.get('/migrateCDR', verifyToken, worker.migrateCDR)
Route.get('/iptables/rule', verifyToken, worker.getRuleIptables)
Route.post('/iptables/blacklist', verifyToken, worker.addBlackList)
Route.post('/iptables/remove', verifyToken, worker.removeRule)

export default Route