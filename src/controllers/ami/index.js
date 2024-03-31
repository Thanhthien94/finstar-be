import manager from 'asterisk-manager'
import { ASTERISK_HOST, AMI_PORT, AMI_USERNAME, AMI_PASSWORD } from '../../util/config/index.js'
// import fs from 'fs'

// const AMI_PORT = '5038'
// const ASTERISK_HOST = 'localhost'
// const AMI_USERNAME = 'admin'
// const AMI_PASSWORD = 'amp111'

const ami = new manager(
  AMI_PORT,
  ASTERISK_HOST,
  AMI_USERNAME,
  AMI_PASSWORD,
  true
)

ami.connect(err => {
  if (err) {
    console.error(err);
  } else {
    console.log('AMI Connected!');
  }
});

ami.keepConnected();
export default {
  ami,
}