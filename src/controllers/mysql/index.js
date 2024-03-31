import mysql from 'mysql';
import { SQL_DATABASE, SQL_HOST, SQL_PASSWORD, SQL_PORT, SQL_USERNAME } from '../../util/config/index.js';
import Bluebird from 'bluebird';

class Mysql {
//   protected ns = 'mysql';
//   static instance: Mysql;

  constructor() {
  }

  static getInstance() {
    if (!Mysql.instance) {
      Mysql.instance = new Mysql();
    }

    return Mysql.instance;
  }

  async execQuery(query) {
    let connection = mysql.createConnection({
      host     : SQL_HOST,
      port     : SQL_PORT,
      user     : SQL_USERNAME,
      password : SQL_PASSWORD,
      database : SQL_DATABASE
    });

    const destroy = () => {
      if (connection) {
        connection.destroy();
        connection = null;
      }
    }

    connection.connect();
    return new Bluebird((resolve, reject) => {
      console.log(query)
      connection.query(query, function (error, results, fields) {
        destroy();
        if (error) {
          return reject(error);
        }

        return resolve(JSON.parse(JSON.stringify(results)));
      });
    }).timeout(30 * 1000).catch((Bluebird.TimeoutError, (error) => {
      destroy();
      console.log('error:', error.message)
    }))
  }
}

const mysqlInstance = Mysql.getInstance();
export default mysqlInstance;
