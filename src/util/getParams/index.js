// import get from 'lodash';

export const getParams = (req) => {
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
    req.query.project ||
    req.query.statusCode ||
    req.query.bank ||
    req.query.name ||
    req.query.company ||
    req.query.status ||
    req.query.autocallStatus ||
    req.query.role ||
    req.query.campaign ||
    req.query.salesTag ||
    req.query.teamleadTag ||
    req.query.supervisorTag ||
    req.query.ASMTag ||
    req.query.headTag ||
    req.query.gteDate ||
    req.query.lteDate ||
    req.query.gteStartTime ||
    req.query.lteStartTime ||
    req.query.offlineTime ||
    req.query.newLead ||
    req.query.pathFile ||
    req.query.typeCard
  ) {
    filters.$and = [
      req.query.user ? { user: req.query.user } : {},
      req.query._id ? { _id: {$in: req.query._id.split(",")} } : {},
      req.query.company ? { company: req.query.company } : {},
      req.query.project ? { project: req.query.project } : {},
      req.query.campaign ? { campaign: req.query.campaign } : {},
      req.query.bank ? { "linkCard.bank": req.query.bank } : {},
      req.query.statusCode
        ? req.query.statusCode === "notNone"
          ? { statusCode: { $ne: "Không có trạng thái" } }
          : { statusCode: req.query.statusCode }
        : {},
      req.query.name ? { name: req.query.name } : {},
      req.query.status ? { status: req.query.status } : {},
      req.query.autocallStatus
        ? { autocallStatus: req.query.autocallStatus }
        : {},
      req.query.role ? { role: req.query.role } : {},
      req.query.typeCard ? { "linkCard.type": req.query.typeCard } : {},
      req.query.salesTag
        ? req.query.salesTag === "null"
          ? { salesTag: null }
          : { salesTag: req.query.salesTag }
        : {},
      req.query.teamleadTag
        ? req.query.teamleadTag === "null"
          ? { teamleadTag: null }
          : { teamleadTag: req.query.teamleadTag }
        : {},
      req.query.supervisorTag
        ? req.query.supervisorTag === "null"
          ? { supervisorTag: null }
          : { supervisorTag: req.query.supervisorTag }
        : {},
      req.query.ASMTag
        ? req.query.ASMTag === "null"
          ? { ASMTag: null }
          : { ASMTag: req.query.ASMTag }
        : {},
      req.query.headTag
        ? req.query.headTag === "null"
          ? { headTag: null }
          : { headTag: req.query.headTag }
        : {},
      req.query.gteDate
        ? {
            createdAt: {
              $gte: new Date(
                new Date(req.query.gteDate).getTime() - 7 * 60 * 60 * 1000
              ),
            },
          }
        : {},
      req.query.lteDate
        ? {
            createdAt: {
              $lte: new Date(
                new Date(req.query.lteDate).getTime() - 7 * 60 * 60 * 1000
              ),
            },
          }
        : {},
      req.query.pathFile
        ? req.query.pathFile === "yes"
          ? { pathFile: { $ne: "" } }
          : { pathFile: { $not: { $ne: "" } } }
        : {},
      req.query.gteStartTime
        ? {
            "request.startTime": {
              $gte: new Date(
                new Date(req.query.gteStartTime).getTime() - 7 * 60 * 60 * 1000
              ),
            },
          }
        : {},
      req.query.lteStartTime
        ? {
            "request.startTime": {
              $lte: new Date(
                new Date(req.query.lteStartTime).getTime() - 7 * 60 * 60 * 1000
              ),
            },
          }
        : {},
      req.query.offlineTime
        ? {
            $or: [
              {
                request: {
                  $not: { $ne: {} },
                },
                createdAt: {
                  $lte: new Date(
                    new Date(req.query.offlineTime).getTime() -
                      7 * 60 * 60 * 1000
                  ),
                },
              },
              {
                "request.startTime": {
                  $lte: new Date(
                    new Date(req.query.offlineTime).getTime() -
                      7 * 60 * 60 * 1000
                  ),
                },
              },
            ],
          }
        : {},
      req.query.newLead
        ? {
            "newLead.createdAt": {
              $lte: new Date(
                new Date(req.query.newLead).getTime() - 7 * 60 * 60 * 1000
              ),
            },
          }
        : {},
    ];
  }

  const keyword = req.query.keyword;
  if (keyword) {
    filters.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { userName: { $regex: keyword, $options: "i" } },
      { phone: { $regex: keyword, $options: "i" } },
      { identification: { $regex: keyword, $options: "i" } },
      { statusCode: { $regex: keyword, $options: "i" } },
      { status: { $regex: keyword, $options: "i" } },
    ];
  }

  return {
    filters,
    options,
  };
};
