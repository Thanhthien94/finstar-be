import express from "express";
import worker from "./worker.js";
import auth from "../../util/authentication/auth.js";

const { verifyToken } = auth;
const Route = express.Router()
Route.post('/cdr/downloadCDR', verifyToken, worker.fetchCDRToDownload)
Route.get('/migrateCDR', verifyToken, worker.migrateCDR)
Route.get('/iptables/rule', verifyToken, worker.getRuleIptables)
Route.post('/iptables/blacklist', verifyToken, worker.addBlackList)
Route.delete('/iptables/blacklist', verifyToken, worker.removeRule)
Route.post('/pbx/restart', verifyToken, worker.restartPBX)
Route.get('/pbx/random', verifyToken, worker.getRandomList)
Route.post('/pbx/random', verifyToken, worker.updateRandomList)

export default Route