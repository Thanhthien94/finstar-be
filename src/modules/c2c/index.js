import express from 'express'
import auth from "../../util/authentication/auth.js";
import call from './controller.js'
// import worker from './worker.js'

const Route = express.Router()
const {verifyToken} = auth

// Route.post('/register', call.register)
Route.post('/call', verifyToken, call.c2c)
// Route.post('/call/worker', verifyToken, worker.c2c)
Route.post('/context', verifyToken, call.addContext)
// Route.post('/disable', verifyToken, call.disableTrunk)

export default Route