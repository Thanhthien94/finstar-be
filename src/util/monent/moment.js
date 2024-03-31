import moment from 'moment-timezone';

const formatTime = (dateTime) => moment(dateTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');

const pathTime = (dateTime) => moment(dateTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD_HH:mm:ss');

const backupTime = (dateTime) => moment(dateTime).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');

const roundDownMin = (dateTime) => moment(dateTime).startOf('minute');

const time = (seconds) => {
  const HH = Math.floor(seconds / (60 * 60)) < 10 ? `0${Math.floor(seconds / (60 * 60))}` : String(Math.floor(seconds / (60 * 60)))
  const mm = Math.floor((seconds % (60 * 60))/60)< 10 ? `0${Math.floor((seconds % (60 * 60))/60)}` : String(Math.floor((seconds % (60 * 60))/60))
  const ss = (seconds % 60) < 10 ? `0${seconds % 60}` : seconds % 60
  return(`${HH}:${mm}:${ss}`)
}

const roundUpMin = (dateTime) =>
  moment(dateTime).second() || moment(dateTime).millisecond()
  ? moment(dateTime).add(1, 'minute').startOf('minute') : moment(dateTime).startOf('minute');

const roundDownHour = (dateTime) => moment(dateTime).startOf('hour');

const roundHourMin = (dateTime) =>
  moment(dateTime).minute() || moment(dateTime).second() || moment(dateTime).millisecond()
  ? moment(dateTime).add(1, 'hour').startOf('hour') : moment(dateTime).startOf('hour');

export default {
  formatTime,
  backupTime,
  roundDownMin,
  roundUpMin,
  roundDownHour,
  roundHourMin,
  pathTime,
  time,
}
