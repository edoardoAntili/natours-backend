class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1A) Filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((field) => delete queryObj[field]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.replaceAll(',', ' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt _id');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.replaceAll(',', ' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const requestedPage = Number(this.queryString.page);
    const requestedLimit = Number(this.queryString.limit);
    this.page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;
    this.limit =
      Number.isSafeInteger(requestedLimit) && requestedLimit > 0
        ? requestedLimit
        : 10;
    const skip = (this.page - 1) * this.limit;

    this.query = this.query.skip(skip).limit(this.limit);

    return this;
  }
}

module.exports = APIFeatures;
