import express from 'express'
import cdr from './controller.js'
import auth from "../../util/authentication/auth.js";

const Route = express.Router()
const {verifyToken} = auth

// Route.post('/register', call.register)
Route.get('/', verifyToken, cdr.fetchCDRMongo)
Route.get('/check', cdr.check)
Route.get('/migrateCDR', verifyToken, cdr.migrateCDR)
Route.get('/download', verifyToken, cdr.fetchCDRToDownload)
Route.get('/talktime', verifyToken, cdr.fetchTalkTime)
Route.get('/aggregate/ampm', verifyToken, cdr.aggregateCDRAmPm)
Route.get('/aggregate/latest', verifyToken, cdr.aggregateCDRLatest)
Route.get('/aggregate/ranked', verifyToken, cdr.aggregateRankedByTimeFrame)
Route.get('/talktime/download', verifyToken, cdr.fetchTalkTimeToDownload)
Route.put('/update/link', verifyToken, cdr.updateLinkRecord)
// Route.post('/context', verifyToken, call.addContext)

export default Route