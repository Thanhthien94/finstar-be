import exceljs from 'exceljs';
import path from "path";
import { EXCELPATH } from '../config/index.js';
import moment from '../monent/moment.js'

const __dirname = path.resolve()+'/uploads';
// console.log({ __dirname });

const readExcel = async (filePath) => {
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  // const rows = worksheet.getRows();

  // @handle header
const headers = [];
const headerMap = {
  'Số HĐ': 'contracts',
  'Tên KH': 'name',
  'DỰ ÁN': 'project',
  'Dự án': 'project',
  'CMND': 'identification',
  'SDT KH': 'phone',
  'Sản Phẩm': 'product',
  'Sản phẩm': 'product',
  'Hạn mức': 'creditLimit',
  'DPD': 'dpd',
  'Tình trạng': 'statusCode',
  'Số tiền Vay': 'loan',
  'Ngày Giải Ngân': 'disbursementDay',
  'Tổng dư nợ + Lãi  hiện tại tạm tính': 'totalLoans',
  'Kì Hạn vay': 'loanTerm',
  'DUEDAY': 'dueDay',
  'Số tiền phải thu (Collect)':'collect',
  'Trả Hàng Tháng':'payMonthly',
  'Địa chỉ Thường Trú': 'permanentAddress',
  'Địa chỉ TT': 'permanentAddress',
  'Địa chỉ Làm việc': 'workAddress',
  'Ngày TT Gần Nhất': 'latestPayment',
  'Số kì trễ hạn': 'numberDelinquencies',
  'Tham chiếu 1': 'reference1',
  'Tham chiếu 2': 'reference2',
  'Chiến dịch': 'campaign',
  // CashLoan
  'Ngày submit app' : 'F1Date',
  'F1_DATE' : 'F1Date',
  'Ngày update': 'dateLastF1',
  'DATE_LAST_F1': 'dateLastF1',
  'Ngày giải ngân' : 'disburedDate',
  'DISBURED_DATE' : 'disburedDate',
  'Mã hồ sơ' : 'appId',
  'APP_ID' : 'appId',
  'Tên khách hàng' : 'name',
  'CUSTOMERNAME' : 'name',
  'Trạng thái' : 'statusCode',
  'F1_STAGE' : 'statusCode',
  'Số tiền đề nghị' : 'ReqInsurance',
  'REQ_AMT_NO_INSURANCE' : 'ReqInsurance',
  'Số tiền được duyệt' : 'disInsurance',
  'DISBURSAL_AMT_NO_INSURANCE' : 'disInsurance',
  'Tổng số tiền vay phê duyệt' : 'DisAmount',
  'DISBURSED_AMOUNT' : 'DisAmount',
  'Kỳ hạn phê duyệt' : 'tenure',
  'TENURE' : 'tenure',
  'Mã Sale' : 'salesCode',
  'SALE_CODE_F1' : 'salesCode',
  'Tỉnh/Thành' : 'customerProvice',
  'CUS_PROVICE' : 'customerProvice',
  'SCHEMEDESC' : 'product',
  'Số hợp đồng' : 'contracts',
  'NATIONAL_ID' : 'contracts',
  'EMI' : 'emi',
  'REJECTED_REASON' : 'rejectedReason',
  'CAN_DETAIL' : 'canDetail',
  'RECEIVE_AFTER' : 'receiveAfter'
}

worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
  if (rowNumber === 1) {
    row.eachCell({ includeEmpty: false }, (cell) => {
      let header = headerMap[cell.value] || cell.value;
      headers.push(header);
    });
  }
});

  // @handle value
  const data = [];

worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
  if (rowNumber > 1) {
    let rowData = {};

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      rowData[headers[colNumber-1]] = cell.value; 
    });

    data.push(rowData);
  }
});

  
  return data;
}

const exportExcel = async (data) => {
  // const data = [
  //   {
  //     name: "John Doe",
  //     email: "johndoe@example.com",
  //     phone: "123-456-7890",
  //   },
  //   {
  //     name: "Jane Doe",
  //     email: "janedoe@example.com",
  //     phone: "098-765-4321",
  //   },
  // ];
  const workbook = new exceljs.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  const headers = Object.keys(data[0])
  sheet.addRow(headers)
  data.forEach((row) => {
    const rowData = [];
    headers.forEach((header) => {
      rowData.push(row[header]);
    });
    sheet.addRow(rowData);
  });
  // console.log({ __dirname });
  const pathFile = `${EXCELPATH}/${moment.pathTime(Date.now())}-export.xlsx`
  await workbook.xlsx.writeFile(pathFile)
  return pathFile
}

export { readExcel, exportExcel };