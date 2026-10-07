import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=process.env.SKILLFORGE_DATA_DIR||fileURLToPath(new URL('../data/',import.meta.url));
mkdirSync(directory,{recursive:true});
const sqlite=new DatabaseSync(join(directory,'skillforge.sqlite'));
sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
if(sqlite.prepare('PRAGMA user_version').get().user_version===0){
 sqlite.exec('BEGIN IMMEDIATE');
 try{sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));sqlite.exec('PRAGMA user_version=1; COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
}
class Statement{
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
 run(){const result=sqlite.prepare(this.sql).run(...this.args);return {meta:{changes:Number(result.changes)}};}
 execute(){return /^\s*SELECT\b/i.test(this.sql)?{results:sqlite.prepare(this.sql).all(...this.args),meta:{changes:0}}:this.run();}
}
const adapter={prepare:sql=>new Statement(sql),batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
export function database(){return adapter;}
export function closeDatabase(){sqlite.close();}
