import express from 'express'
import cdr from './controller.js'
import auth from "../../util/authentication/auth.js";

const Route = express.Router()
const {verifyToken} = auth

// Route.post('/register', call.register)
Route.get('/', verifyToken, cdr.fetchCDRMongo)

// ✅ Enhanced duplicate management routes
Route.get('/check', cdr.check) // Enhanced with time range params
Route.get('/duplicates/find', verifyToken, cdr.findDuplicates) // New: Find only
Route.post('/duplicates/remove', verifyToken, cdr.removeDuplicates) // New: Remove with confirmation
Route.get('/duplicates/stats', verifyToken, cdr.getDuplicateStats) // New: Statistics only

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