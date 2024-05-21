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
        ? ` WHERE (cnum IN (${req.query.cnum}) OR src IN (${req.query.cnum}))`
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

export const getParamsCDRMongo = (req) => {
  const filters = {};
  const options = {};
  // const role = {};

  if (req.query.limit) {
    options.limit = parseInt(req.query.limit);
  } else options.limit = 20;

  if (req.query.reverse) {
    options.sort = { createdAt: -1 };
  }

  if (req.query.sortBy) {
    options.sort = { [req.query.sortBy]: 1 };
  }

  if (req.query.sortOrder) {
    options.sort[req.query.sortBy] = req.query.sortOrder === "desc" ? -1 : 1;
  }

  if (req.query.page) {
    options.skip = (req.query.page - 1) * options.limit;
  } else {
    options.skip = 0;
  }

  if (
    req.query._id ||
    req.query.user ||
    req.query.name ||
    req.query.company ||
    req.query.disposition ||
    req.query.dst ||
    req.query.fromDate ||
    req.query.toDate ||
    req.query.gteStartTime ||
    req.query.lteStartTime
  ) {
    filters.$and = [
      req.query.user ? { user: req.query.user } : {},
      req.query._id ? { user: req.query._id } : {},
      req.query.name ? { name: req.query.name } : {},
      req.query.company ? { company: req.query.company } : {},
      req.query.disposition ? { disposition: req.query.disposition } : {},
      req.query.dst ? { dst: req.query.dst } : {},
      req.query.fromDate
        ? {
            createdAt: {
              $gte: new Date(
                new Date(req.query.fromDate).getTime()
              ),
            },
          }
        : {},
      req.query.toDate
        ? {
            createdAt: {
              $lte: new Date(
                new Date(req.query.toDate).getTime()
              ),
            },
          }
        : {},
      req.query.pathFile
        ? req.query.pathFile === "yes"
          ? { pathFile: { $ne: "" } }
          : { pathFile: { $not: { $ne: "" } } }
        : {},
    ];
  }

  const keyword = req.query.keywordCDR;
  if (keyword) {
    filters.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { userName: { $regex: keyword, $options: "i" } },
      { phone: { $regex: keyword, $options: "i" } },
      { identification: { $regex: keyword, $options: "i" } },
      { statusCode: { $regex: keyword, $options: "i" } },
      { status: { $regex: keyword, $options: "i" } },
      { codeSHB: { $regex: keyword, $options: "i" } },
      { codeMAFC: { $regex: keyword, $options: "i" } },
      { cnum: { $regex: keyword, $options: "i" } },
      { dst: { $regex: keyword, $options: "i" } },
    ];
  }

  return {
    filters,
    options,
  };
};