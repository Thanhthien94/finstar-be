export const getParamsCDR = (req) => {
  let limit = Number(req.query.limit) || 20;
  let offset = 0;
  let filter = "";
  let page = Number(req.query.page) || 1;

  if (req.query.page) {
    offset = (page - 1) * limit;
  }

  if (req.query.dst) {
    filter +=
      filter.split("WHERE").length <= 1
        ? ` WHERE dst IN (${req.query.dst})`
        : ` AND dst IN (${req.query.dst})`;
  }
  if (req.query.cnum) {
    filter +=
      filter.split("WHERE").length <= 1
        ? ` WHERE cnum IN (${req.query.cnum})`
        : ` AND cnum IN (${req.query.cnum})`;
  }
  if (req.query.lastapp) {
    filter +=
      filter.split("WHERE").length <= 1
        ? ` WHERE lastapp IN ('${req.query.lastapp}')`
        : ` AND lastapp IN ('${req.query.lastapp}')`;
  }
  if (req.query.disposition) {
    filter +=
      filter.split("WHERE").length <= 1
        ? req.query.disposition === "BUSY"
          ? ` WHERE (disposition IN ('${req.query.disposition}') OR lastapp IN ('Playback'))`
          : req.query.disposition === "ANSWERED"
          ? ` WHERE (disposition IN ('${req.query.disposition}') AND lastapp IN ('Dial'))`
          : ` WHERE disposition IN ('${req.query.disposition}')`
        : req.query.disposition === "BUSY"
        ? ` AND (disposition IN ('${req.query.disposition}') OR lastapp IN ('Playback'))`
        : req.query.disposition === "ANSWERED"
        ? ` AND (disposition IN ('${req.query.disposition}') AND lastapp IN ('Dial'))`
        : ` AND disposition IN ('${req.query.disposition}')`;
  }
  if (req.query.fromDate) {
    filter +=
      filter.split("WHERE").length <= 1
        ? ` WHERE calldate >= ${JSON.stringify(req.query.fromDate)}`
        : ` AND calldate >= ${JSON.stringify(req.query.fromDate)}`;
  }
  if (req.query.toDate) {
    filter +=
      filter.split("WHERE").length <= 1
        ? ` WHERE calldate <= ${JSON.stringify(req.query.toDate)}`
        : ` AND calldate <= ${JSON.stringify(req.query.toDate)}`;
  }

  return {
    limit,
    offset,
    page,
    filter,
  };
};
