import { Injectable } from 'injection-js';
const Sqlite = require('nativescript-sqlite');

function _exists(o, k): boolean {
  return o[k] !== undefined && o[k] !== null && o[k] !== NaN;
}

@Injectable()
export class SqliteService {
  static DatabaseName: string = 'PushTrackerDatabase';

  private _db: any = null;

  public getDatabase() {
    return new Sqlite(SqliteService.DatabaseName);
  }

  get db() {
    try {
      if (this._db) {
        return Promise.resolve(this._db);
      } else {
        return new Sqlite(SqliteService.DatabaseName).then((db: any) => {
          this._db = db;
          return this._db;
        });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public closeDatabase() {
    this.db
      .then((db: any) => {
        db.close();
      })
      .catch(err => {
        console.error('could not close db:', err);
      });
  }

  public makeTable(tableName: string, idName: string, keys: any[]) {
    const keyString = keys.map(k => {
      return `${k.name} ${k.type}`;
    });
    return this.db
      .then(db => {
        const dbCreationString =
          `CREATE TABLE IF NOT EXISTS ${tableName} ` +
          `(${idName} INTEGER PRIMARY KEY AUTOINCREMENT, ` +
          `${keyString.join(', ')})`;
        return db.execSQL(dbCreationString);
      })
      .catch(err => {
        const msg = 'Could not make table: ' + tableName + ': error - ' + err;
        console.error(msg);
        return Promise.reject(msg);
      });
  }

  public insertIntoTable(tableName: string, obj: any) {
    return this.db.then(db => {
      const objKeyNames = Object.keys(obj);
      const values = objKeyNames.map(key => obj[key]);
      const objValues = new Array(objKeyNames.length).fill('?');
      const dbInsertString =
        `insert into ${tableName} ` +
        `(${objKeyNames.join(',')}) values ` +
        `(${objValues.join(',')})`;
      return db.execSQL(dbInsertString, values);
    });
  }

  public updateInTable(tableName: string, sets: any, queries: any) {
    /**
     *  expects sets to be an object of the form:
     *   {
     *     "columnId": <value>,
     *     ...
     *   }
     *  and
     *  expects queries to be an object of the form:
     *   {
     *     "columnId": <value>,
     *     ...
     *   }
     */
    return this.db.then(db => {
      const parameters = [];
      const setsStrings = Object.keys(sets);
      const setValues = setsStrings.map(s => {
        if (_exists(sets, s)) {
          parameters.push(sets[s]);
          return `${s}=?`;
        } else return ``;
      });
      const queryStrings = Object.keys(queries).map(q => {
        if (_exists(queries, q)) {
          parameters.push(queries[q]);
          return `${q}=?`;
        } else return ``;
      });
      const dbUpdateString =
        `UPDATE ${tableName} ` +
        `SET ${setValues.join(', ')} ` +
        `WHERE ${queryStrings.join(' and ')}`;
      return db.execSQL(dbUpdateString, parameters);
    });
  }

  public delete(tableName: string, queries: any) {
    /**
     *  expects queries to be an object of the form:
     *   {
     *     "columnId": <value>,
     *     ...
     *   }
     */
    return this.db.then(db => {
      const parameters = [];
      const queryStrings = Object.keys(queries).map(q => {
        if (_exists(queries, q)) {
          parameters.push(queries[q]);
          return `${q}=?`;
        } else return ``;
      });
      const dbDeleteString =
        `DELETE FROM ${tableName} ` + `WHERE ${queryStrings.join(' and ')}`;
      return db.execSQL(dbDeleteString, parameters);
    });
  }

  public getLast(tableName: string, idName: string) {
    return this.db.then(db => {
      return db.get(
        `SELECT * FROM ${tableName} ORDER BY ${idName} DESC LIMIT 1`
      );
    });
  }

  public getOne(args: {
    tableName: string;
    queries?: any;
    orderBy?: string;
    ascending?: boolean;
  }) {
    /**
     *  expects queries to be an object of the form:
     *   {
     *     "columnId": <value>,
     *     ...
     *   }
     */
    return this.db.then(db => {
      const tableName = args.tableName;
      const queries = args.queries;
      const orderBy = args.orderBy;
      const ascending = args.ascending;
      let dbGetString = `SELECT * from ${tableName}`;
      let parameters = undefined;
      if (queries) {
        parameters = [];
        const queryStrings = Object.keys(queries).map(q => {
          if (_exists(queries, q)) {
            parameters.push(queries[q]);
            return `${q}=?`;
          } else return ``;
        });
        dbGetString += ` where ${queryStrings.join(' and ')}`;
      }
      if (orderBy) {
        dbGetString += ` ORDER BY ${orderBy}`;
        if (ascending) {
          dbGetString += ' ASC';
        } else {
          dbGetString += ' DESC';
        }
      }
      return db.get(dbGetString, parameters);
    });
  }

  public getAll(args: {
    tableName: string;
    queries?: any;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
    offset?: number;
  }) {
    /**
     *  expects queries to be an object of the form:
     *   {
     *     "columnId": <value>,
     *     ...
     *   }
     */
    return this.db.then(db => {
      const tableName = args.tableName;
      const queries = args.queries;
      const orderBy = args.orderBy;
      const ascending = args.ascending;
      const limit = args.limit;
      const offset = args.offset;
      let dbGetString = `SELECT * from ${tableName}`;
      let parameters = undefined;
      if (queries) {
        parameters = [];
        const queryStrings = Object.keys(queries).map(q => {
          if (_exists(queries, q)) {
            parameters.push(queries[q]);
            return `${q}=?`;
          } else return ``;
        });
        dbGetString += ` where ${queryStrings.join(' and ')}`;
      }
      if (orderBy) {
        dbGetString += ` ORDER BY ${orderBy}`;
        if (ascending) {
          dbGetString += ' ASC';
        } else {
          dbGetString += ' DESC';
        }
      }
      if (limit > 0) {
        dbGetString += ` LIMIT ${limit}`;
      }
      if (orderBy && offset) {
        dbGetString += ` OFFSET ${offset}`;
      }
      return db.all(dbGetString, parameters);
    });
  }

  public getSum(tableName: string, columnName: string) {
    return this.db
      .then(db => {
        const dbString = `SELECT SUM(${columnName}) as Total FROM ${tableName}`;
        return db.execSQL(dbString);
      })
      .then(row => {
        return row && row[0];
      });
  }
}
