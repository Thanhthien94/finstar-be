import express from "express";
import worker from "./worker.js";
import auth from "../../util/authentication/auth.js";

const { verifyToken } = auth;
const Route = express.Router()
Route.post('/cdr/downloadCDR', verifyToken, worker.fetchCDRToDownload)
Route.get('/migrateCDR', verifyToken, worker.migrateCDR)
Route.get('/iptables/rule', verifyToken, worker.getRuleIptables)

export default Route