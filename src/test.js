// import Manager from 'asterisk-manager'

// const ASTERISK_HOST = "192.168.1.113";
// const AMI_USERNAME = "admin";
// const AMI_PASSWORD = "amp111";
// const AMI_PORT = "5038";
// const TLS = "true";

// const ami = new Manager(
//   AMI_PORT,
//   ASTERISK_HOST,
//   AMI_USERNAME,
//   AMI_PASSWORD,
// //   true
// );

// ami.on("managerevent", (event) => {
//   console.log("Received event:", event);
// });

// ami.connect(err => {
//     if(err) {
//       console.error(err);
//     } else {
//       console.log('Connected!');
//     }
//   });
// ami.keepConnected();

// const makeCall = async () => {
//   try {

//     await ami.action({
      // action: 'originate',
      // channel: 'local/0818883311@from-ag-ext',
      // Account: 'autodialer',
      // WaitTime: '30',
      // Callerid: 'thien_call',
      // Priority: '1',
      // Application: 'Playback',
      // Data: 'autodialer/auto_dialer',
      // action: "originate",
      // channel: "PJSIP/9998",
      // context: "from-ag-ext",
      // priority: 1,
      // exten: '0818883311',
      // async: "true",
      // callerid: '9998',
    //   Action: "Originate",
    //   Channel: "Local/0818883311@from-test_thien",
      // Variable: {
      //   SAY_VARIABLE: "/var/lib/asterisk/sounds/autodialer/auto_dialer.gsm",
      //   SAY_METHOD: "read",
      //   SAY_EXTRA_ARGS: "digits/1",
      // },
      // Application: 'Dial',
      // Data: 'PJSIP/50011',
    //   Context: "from-ext",
    //   Exten: "500501",
    //   Priority: 1,
    //   Async: true,
//     }, (err, event) => {
//         if (err) {
//           console.log(err)
//         } else {
//           console.log(event)
//         } 
//       });
//     console.log("Call initiated succsessfully");
//   } catch (error) {
//     console.error("Failed to initiate call:", error);
//   }
// };

// const reload = async () => {
//   try {
//     // ami.on('eventReload', onReload);
//     await ami.action({
//       Action: 'Reload',
//       // Command: 'dialplan reload'
//     })
//     console.log('reload succsessfully');
//   } catch (error) {
//     console.log(error);
//   }
// }

// ami.action({
//   Action: 'ListCommands'
// }, (err, res) => {
//   if (err) throw err;

//   console.log('Queue List:', res);
// });
// const makeCall3 = async () => {
    //   try {
//     await ami.action({
//       action: 'agi',
//       channel: 'Local/0818883311@from-ag-ext', // Kênh SIP của người được gọi
//       command: 'EXEC Playback autodialer/auto_dialer' // Thay 'your-audio-file' bằng đường dẫn đến tệp audio của bạn
//     });
//     console.log("Call initiated succsessfully");
//   } catch (error) {
//     console.error("Failed to initiate call:", error);
//   }
// };

// makeCall();

const array = [1,5]

const shiftElementToEnd = (array) => {
  const [lastElement] = array.splice(0,1)
  console.log({lastElement, array})
  array.push(lastElement)
  return array
}

const resulf = shiftElementToEnd(array)

console.log({resulf})