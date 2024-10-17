import { Client } from "es7";
import {
  ELASTIC_USER,
  ELASTIC_PASSWORD,
  ELASTIC_HOST,
} from "../../util/config/index.js";

const elastic = new Client({
  node: ELASTIC_HOST,
  auth: {
    username: ELASTIC_USER,
    password: ELASTIC_PASSWORD,
  },
});

// Lắng nghe sự kiện 'response' để biết khi nào client nhận được phản hồi từ Elasticsearch
elastic.on("response", (err, event) => {
  if (err) {
    console.error("Error occurred during connection:", err);
  } else {
    console.log(`Connected to Elasticsearch: ${event.statusCode}`);
  }
});

// Kiểm tra kết nối đến Elasticsearch
elastic.ping({}, (err, result) => {
  if (err) {
    console.error("Elasticsearch cluster is down:", err);
  } else {
    console.log("Elasticsearch cluster is up and running");
    console.log("result: ", result);
  }
});

export async function createDocument(index, model, id, body) {
  try {
    const response = await elastic.index({
      index, // Tên của index
      id,
      body: {model, ...body},
    });

    console.log("Document created:", response);
  } catch (error) {
    console.error("Error creating document:", error);
  }
}
export async function updateDocument(index, id, body) {
  try {
    const response = await elastic.update({
      index,
      id,
      body:{
        doc: body
      },
    });

    console.log("Document updated:", response);
  } catch (error) {
    console.error("Error updating document:", error);
  }
}

export default elastic;
