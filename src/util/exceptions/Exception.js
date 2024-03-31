import { print, OutputType } from "../helpers/print.js"

export default class Exception extends Error {
    static WRONG_DB_USERNAME_PASSWORD  = "Wrong database's username and password"
    static WRONG_CONNECTION_TRING = "Wrong server name/connection string"
    static CANNOT_CONNECT_MONGODB = "Cannot connect to MongoDB"
    static USER_EXIST = "User already exists"
    static USER_NOTFOUND = "User not found"
    static CANNOT_REGISTER_USER = "Cannot register user"
    static WRONG_EMAIL_AND_PASSWORD = "wrong email or password"
    static INVALID_TOKEN = "Invalid Token"
    
    
    constructor(message){
        super(message) // call contructor of parent class(Error)
        print(message, OutputType.ERROR)
        this.validationErrors = message
    }
}