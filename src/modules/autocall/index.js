import express from 'express'
import auth from "../../util/authentication/auth.js";
import call from './controller.js'
// import worker from './worker.js'

const Route = express.Router()
const {verifyToken} = auth

// Route.post('/register', call.register)
// Route.post('/spam', verifyToken, worker.spamCall)
// Route.post('/campaign/start/worker', verifyToken, worker.actionCampaign)
Route.get('/campaign', verifyToken, call.fetchCampaignList)
Route.post('/campaign', verifyToken, call.createCampaign)
Route.delete('/campaign', verifyToken, call.removeCampaign)
Route.post('/campaign/start', verifyToken, call.actionCampaign)
Route.post('/campaign/stop', verifyToken, call.stopCampaign)

export default Route