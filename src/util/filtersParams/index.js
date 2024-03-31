const multiFilter = (data, filters) => {
  console.log("filter:", filters);
  return data.filter((item) => {
    for (let key in filters) {
      // const createdAt = new Date(item.createdAt)
      //   console.log('createdAt: ', createdAt)
      if (
        (
          key !== "createdAt" &&
          filters[key] &&
          item[key] &&
          item[key].toString() !== filters[key]) ||
        (key !== "createdAt" && filters[key] && !item[key])
      ) {
        return false;
      } else if (
        filters[key] &&
        key === "createdAt"
      ) {
        if(filters[key].$gte &&  new Date(item.createdAt).getTime() < filters[key].$gte)
        return false;
        if(filters[key].$lte &&  new Date(item.createdAt).getTime() > filters[key].$lte)
        return false;
      }
    }
    return true;
  });
};

export { multiFilter };
